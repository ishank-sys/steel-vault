import { getGCSStorage } from '../gcs.js';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { batchUpsertDrawings } from './projectDrawingsJob.js';

const GCS_BUCKET = process.env.GCS_BUCKET;

// Helper function to handle uploads to GCS
export async function handleUploadJob(job, prisma) {
  const payload = job.payload || {};
  const { 
    fileBase64, 
    fileName, 
    contentType, 
    clientId, 
    projectId, 
    packageId, 
    packageName,
    subFolder, // e.g., 'design-drawings', '3d-models', 'extras'
    logType = 'EMPLOYEE_UPLOAD',
    fileType // for categorization (e.g., 'Extra', '3D Model', 'Design Drawing')
  } = payload;

  if (!fileBase64 || !fileName) {
    throw new Error('fileBase64 and fileName are required');
  }

  if (!GCS_BUCKET) {
    throw new Error('GCS_BUCKET not configured');
  }

  const storage = getGCSStorage();
  
  // Convert clientId/projectId to numbers
  const cleanClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : Number(clientId);
  const cleanProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : Number(projectId);
  const cleanPackageId = packageId != null ? (typeof packageId === 'string' ? parseInt(packageId, 10) : Number(packageId)) : null;

  if (!Number.isFinite(cleanClientId) || !Number.isFinite(cleanProjectId)) {
    throw new Error('clientId and projectId are required and must be numeric');
  }

  // Get client and project info for folder structure
  const client = await prisma.client.findUnique({ where: { id: cleanClientId } });
  if (!client) {
    throw new Error(`Client with id ${cleanClientId} not found`);
  }

  const project = await prisma.project.findUnique({ where: { id: Number(cleanProjectId) } });
  if (!project) {
    throw new Error(`Project with id ${cleanProjectId} not found`);
  }

  // Create folder structure
  let clientFolder = `clients/${client.id}`;
  let clientNameSafe = '';
  if (client.name) {
    clientNameSafe = String(client.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    clientFolder = `clients/${client.id}-${clientNameSafe}`;
  }

  // Get project folder
  let projectFolder = `project-${project.id}`;
  if (project.name) {
    const projectNameSafe = String(project.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    projectFolder = `${project.id}-${projectNameSafe}`;
  }

  // Add subfolder if specified
  const destName = `${Date.now()}_${fileName}`;
  let destinationPath;
  if (subFolder) {
    destinationPath = `${clientFolder}/${projectFolder}/${subFolder}/${destName}`;
  } else {
    destinationPath = `${clientFolder}/${projectFolder}/${destName}`;
  }

  // Convert base64 to buffer and create readable stream
  const fileBuffer = Buffer.from(fileBase64, 'base64');
  const fileSize = fileBuffer.length;
  const nodeStream = Readable.from(fileBuffer);

  const bucket = storage.bucket(GCS_BUCKET);
  const gcsFile = bucket.file(destinationPath);

  // Check if file already exists
  let alreadyExists = false;
  try {
    const [exists] = await gcsFile.exists();
    alreadyExists = exists;
  } catch (e) {
    // ignore
  }

  // Upload to GCS
  const writeStream = gcsFile.createWriteStream({
    resumable: false,
    contentType: contentType || 'application/octet-stream',
  });

  try {
    await pipeline(nodeStream, writeStream);
  } catch (error) {
    throw new Error(`Failed to upload file to GCS: ${error.message}`);
  }

  const objectPath = destinationPath;
  const storagePath = `gs://${GCS_BUCKET}/${objectPath}`;

  // Clamp file size for Prisma Int field
  let normSize = fileSize;
  const INT_MAX = 2147483647;
  if (normSize > INT_MAX) normSize = INT_MAX;

  // Create DocumentLog entry
  let record;
  try {
    const actualLogType = alreadyExists ? 'NAVIGATE_EXISTING' : logType;
    record = await prisma.documentLog.create({
      data: {
        fileName,
        clientId: cleanClientId,
        projectId: BigInt(cleanProjectId),
        storagePath: objectPath,
        size: normSize,
        logType: actualLogType,
      },
    });
  } catch (e) {
    console.error('Failed to create DocumentLog:', e);
    throw new Error(`Failed to log upload: ${e.message}`);
  }

  // NOTE: Design drawing upserts are handled by publish-job only
  // Removed duplicate upsert logic to prevent triple insertion

  // Optional: maintain separate upload table if present
  try {
    await prisma.upload.create({
      data: {
        clientId: cleanClientId,
        projectId: BigInt(cleanProjectId),
        filename: fileName,
        storagePath: objectPath,
        size: normSize,
      },
    });
  } catch (e) {
    console.warn('Failed to create Upload record:', e);
    // Non-critical, continue
  }

  function serializeForJson(value) {
    if (typeof value === 'bigint') return value.toString();
    if (Array.isArray(value)) return value.map(serializeForJson);
    if (value && typeof value === 'object') {
      const out = {};
      for (const k of Object.keys(value)) out[k] = serializeForJson(value[k]);
      return out;
    }
    return value;
  }

  return {
    success: true,
    objectPath,
    storagePath,
    fileName,
    size: fileSize,
    record: serializeForJson(record),
    message: `File uploaded successfully to ${objectPath}`,
  };
}