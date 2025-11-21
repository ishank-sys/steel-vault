import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getGCSStorage } from "@/lib/gcs";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();
const GCS_BUCKET = process.env.GCS_BUCKET;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // If multipart/form-data -> handle file upload to GCS
    if (contentType.includes("multipart/form-data")) {
      const storage = getGCSStorage();
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

      // Get file size for logging
      const fileSize = file.size || 0;

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

      // Convert Web ReadableStream to Node Readable and pipeline to GCS
      const nodeStream = Readable.fromWeb(file.stream());
      const writeStream = gcsFile.createWriteStream({
        resumable: false,
        contentType: file.type || 'application/octet-stream',
      });

      const abortHandler = () => {
        try { nodeStream.destroy?.(); } catch (e) {}
        try { writeStream.destroy?.(); } catch (e) {}
      };
      req.signal?.addEventListener?.('abort', abortHandler);

      try {
        await pipeline(nodeStream, writeStream);
      } finally {
        req.signal?.removeEventListener?.('abort', abortHandler);
      }

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
            size: fileSize,
            logType,
          },
        });
        // Upsert into ProjectDrawing so filenames are visible in Supabase
        try {
          const drawingBaseRaw = String(file.name || '').replace(/\.[^/.]+$/, '').trim() || (file.name || `upload-${Date.now()}`);
          const drawingBase = (String(drawingBaseRaw).split('-')[0] || drawingBaseRaw).trim();
          const inferredCategory = 'A'; // design-drawings -> A (Shop)
          await prisma.projectDrawing.upsert({
            where: {
              projectId_drgNo_category: {
                projectId: Number(projectId),
                drgNo: drawingBase,
                category: inferredCategory,
              },
            },
            update: {
              fileName: file.name || undefined,
              lastAttachedAt: new Date(),
              meta: {
                fileNames: [file.name],
                storagePath: objectPath,
                size: fileSize,
                source: 'upload-design-drawing',
                logType,
              },
            },
            create: {
              clientId: client.id,
              projectId: Number(projectId),
              drgNo: drawingBase,
              category: inferredCategory,
              fileName: file.name || undefined,
              lastAttachedAt: new Date(),
              meta: {
                fileNames: [file.name],
                storagePath: objectPath,
                size: fileSize,
                source: 'upload-design-drawing',
                logType,
              },
            },
          });
        } catch (e) {
          console.warn('[upload-design-drawing] ProjectDrawing upsert failed, attempting API fallback:', e?.message || e);
          try {
            const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            await fetch(`${origin}/api/project-drawings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: client.id,
                projectId: Number(projectId),
                entries: [{
                  drgNo: String(file.name || '').replace(/\.[^/.]+$/, '').trim() || (file.name || `upload-${Date.now()}`),
                  category: 'A',
                  revision: null,
                  fileNames: [file.name],
                  issueDate: new Date().toISOString().slice(0,10),
                }]
              })
            });
          } catch (fallbackErr) {
            console.warn('[upload-design-drawing] Fallback /api/project-drawings failed:', fallbackErr?.message || fallbackErr);
          }
        }
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
