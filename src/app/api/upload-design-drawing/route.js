import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";

const prisma = new PrismaClient();
const storage = new Storage(); // uses ADC or GOOGLE_APPLICATION_CREDENTIALS
const GCS_BUCKET = process.env.GCS_BUCKET;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // If multipart/form-data -> handle file upload to GCS
    if (contentType.includes("multipart/form-data")) {
      if (!GCS_BUCKET) {
        return NextResponse.json({ error: "GCS_BUCKET not configured" }, { status: 500 });
      }

      const formData = await req.formData();
      const file = formData.get("file");
      const projectId = formData.get("projectId") || "unknown";

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Detect company based on the logged-in user
      const userEmail = req.headers.get("x-user-email"); // Assume email is passed in headers
      if (!userEmail) {
        return NextResponse.json({ error: "User email not provided" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user || !user.clientId) {
        return NextResponse.json({ error: "User not associated with any company" }, { status: 403 });
      }

      const client = await prisma.client.findUnique({ where: { id: user.clientId } });
      if (!client) {
        return NextResponse.json({ error: "Client company not found" }, { status: 404 });
      }


      // --- Unified folder logic ---
      // Get client folder: clients/{clientId}-{clientName}
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

      // Get project folder: {projectId}-{projectName}
      let projectFolder = '';
      let projectNameSafe = '';
      try {
        const projectRecord = await prisma.project.findUnique({ where: { id: Number(projectId) } });
        if (projectRecord) {
          const raw = projectRecord.name || `project-${projectRecord.id}`;
          projectNameSafe = String(raw)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
          projectFolder = `${projectRecord.id}-${projectNameSafe}`;
        }
      } catch (e) {
        console.warn('Could not resolve project name; using id fallback', e?.message || e);
      }

      const originalName = file.name || `upload-${Date.now()}`;
      const destName = `${Date.now()}_${originalName}`;
      // Add design-drawings subfolder for design drawing uploads
      const destinationPath = `${clientFolder}/${projectFolder}/design-drawings/${destName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const bucket = storage.bucket(GCS_BUCKET);
      const gcsFile = bucket.file(destinationPath);

      // Check if file/folder already exists (for logging navigation)
      let alreadyExists = false;
      try {
        const [exists] = await gcsFile.exists();
        alreadyExists = exists;
      } catch (e) {
        // ignore
      }

      await gcsFile.save(buffer, {
        resumable: false,
        contentType: file.type || 'application/octet-stream',
      });

      // Do NOT make public. Persist the object path (private) in DB.
      const objectPath = destinationPath;

      try {
        const logType = alreadyExists ? 'NAVIGATE_EXISTING' : 'CLIENT_UPLOAD';
        const created = await prisma.documentLog.create({
          data: {
            fileName: file.name || `upload-${Date.now()}`,
            clientId: client.id,
            projectId: projectId ? Number(projectId) : null,
            storagePath: objectPath,
            size: buffer.length,
            logType,
          },
        });
        return NextResponse.json({
          message: alreadyExists ? 'File replaced/navigated' : 'Uploaded',
          record: typeof created !== 'undefined' ? created : { storagePath: objectPath },
        });
      } catch (logErr) {
        console.error('Failed to log document upload:', logErr.message || logErr);
      }
    }

    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  } catch (err) {
    console.error("❌ API error in /api/upload-design-drawing POST:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
