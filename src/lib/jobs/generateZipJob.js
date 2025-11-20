import archiver from 'archiver';
import { getGCSStorage } from '../gcs.js';

export async function handleGenerateZip(job, prisma) {
  const payload = job.payload || {};
  const objectPaths = Array.isArray(payload.objectPaths) ? payload.objectPaths : [];
  const zipName = payload.zipName || `transmittal-${job.id}.zip`;
  const bucketFromEnv = process.env.GCS_BUCKET;
  if (!objectPaths.length) throw new Error('No objectPaths provided for generate-zip');
  const storage = getGCSStorage();
  const first = objectPaths[0] || '';
  const bucket = bucketFromEnv || (first.startsWith('gs://') ? first.replace(/^gs:\/\/(.*?)\/.*$/, '$1') : null);
  if (!bucket) throw new Error('GCS bucket not configured (GCS_BUCKET env var)');

  const destPath = (payload.destinationPath) || `transmittals/${payload.projectId || 'unknown'}/${zipName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destFile = storage.bucket(bucket).file(destPath);
  const writeStream = destFile.createWriteStream({ resumable: false, contentType: 'application/zip' });

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(writeStream);

  for (const obj of objectPaths) {
    try {
      let path = String(obj || '');
      if (path.startsWith('gs://')) {
        const m = path.match(/^gs:\/\/(.*?)\/(.*)$/);
        if (m) path = m[2];
      }
      const file = storage.bucket(bucket).file(path);
      const baseName = path.split('/').pop() || `file-${Date.now()}`;
      const remoteStream = file.createReadStream();
      archive.append(remoteStream, { name: baseName });
    } catch (e) {
      console.warn('[generateZipJob] failed to include', obj, e?.message || e);
    }
  }

  const finalizePromise = new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    archive.on('error', reject);
  });

  await archive.finalize();
  await finalizePromise;

  // Try to create DocumentLog entry
  let record = null;
  try {
    const [meta] = await destFile.getMetadata();
    const size = Number(meta.size || 0);
    record = await prisma.documentLog.create({ data: {
      fileName: zipName,
      clientId: payload.clientId || (payload.clientId === 0 ? 0 : Number(payload.clientId) || 0),
      projectId: payload.projectId || (payload.projectId === 0 ? 0 : Number(payload.projectId) || 0),
      storagePath: `gs://${bucket}/${destPath}`,
      size,
      logType: payload.logType || 'TRANSMITTAL_ZIP',
    }});
  } catch (e) {
    console.warn('[generateZipJob] failed to create DocumentLog', e?.message || e);
  }

  return { storagePath: `gs://${bucket}/${destPath}`, fileName: zipName, record };
}

export default { handleGenerateZip };
