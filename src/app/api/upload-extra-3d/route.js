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

    // Handle multipart/form-data for file uploads
    if (contentType.includes("multipart/form-data")) {
      const storage = getGCSStorage();
      if (!GCS_BUCKET) {
        return NextResponse.json({ error: "GCS_BUCKET not configured" }, { status: 500 });
      }

      const formData = await req.formData();
      const file = formData.get("file");
      const projectId = formData.get("projectId") || "unknown";
      const fileType = formData.get("fileType") || "Extra"; // "Extra" or "3D Model"

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Get user email from headers
      const userEmail = req.headers.get("x-user-email");
      if (!userEmail) {
        return NextResponse.json({ error: "User email not provided" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ 
        where: { email: userEmail },
        include: { client: true }
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Handle both client users and admin users
      let client = user.client;
      let clientId = user.clientId;
      
      // If user is admin or doesn't have a client, use a default or get from project
      if (!client && user.userType === 'admin') {
        // For admin users, try to get client from project
        try {
          const project = await prisma.project.findUnique({ 
            where: { id: Number(projectId) },
            include: { client: true }
          });
          if (project && project.client) {
            client = project.client;
            clientId = project.client.id;
          } else {
            // Create a default admin folder structure
            client = { id: 1, name: 'Admin-Files' };
            clientId = 1;
          }
        } catch (e) {
          client = { id: 1, name: 'Admin-Files' };
          clientId = 1;
        }
      } else if (!client) {
        return NextResponse.json({ error: "User not associated with any company" }, { status: 403 });
      }

      // Create folder structure for client and project
      let clientFolder = `clients/${clientId}`;
      let clientNameSafe = '';
      if (client && client.name) {
        clientNameSafe = String(client.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80);
        clientFolder = `clients/${clientId}-${clientNameSafe}`;
      }

      // Get project folder
      let projectFolder = '';
      try {
        const projectRecord = await prisma.project.findUnique({ where: { id: Number(projectId) } });
        if (projectRecord) {
          const raw = projectRecord.name || `project-${projectRecord.id}`;
          const projectNameSafe = String(raw)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
          projectFolder = `${projectRecord.id}-${projectNameSafe}`;
        }
      } catch (e) {
        console.warn('Could not resolve project name; using id fallback', e?.message || e);
        projectFolder = `project-${projectId}`;
      }

      const originalName = file.name || `upload-${Date.now()}`;
      const destName = `${Date.now()}_${originalName}`;
      
      // Create different subfolders for Extra and 3D Model files
      const subFolder = fileType === "3D Model" ? "3d-models" : "extras";
      const destinationPath = `${clientFolder}/${projectFolder}/${subFolder}/${destName}`;

      const fileSize = file.size || 0;
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

      // Convert Web ReadableStream to Node Readable and upload to GCS
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

      // Log to database
      try {
        const logType = alreadyExists ? 'NAVIGATE_EXISTING' : 'CLIENT_UPLOAD';
        
        // Verify that clientId exists in the Client table before creating DocumentLog
        const clientExists = await prisma.client.findUnique({
          where: { id: clientId }
        });
        
        if (!clientExists) {
          console.warn(`Client with ID ${clientId} not found, skipping document log`);
          return NextResponse.json({
            message: 'File uploaded successfully, but logging skipped due to missing client',
            fileUrl: destinationPath,
          });
        }
        
        const created = await prisma.documentLog.create({
          data: {
            fileName: originalName,
            clientId: clientId,
            projectId: Number(projectId),
            storagePath: destinationPath,
            size: fileSize,
            logType: `${fileType.toUpperCase()}_${logType}`,
          },
        });

        // Upsert into ProjectDrawing so filenames show in Supabase
        try {
          const drawingBaseRaw = String(originalName).replace(/\.[^/.]+$/, '').trim() || originalName;
          const drawingBase = (String(drawingBaseRaw).split('-')[0] || drawingBaseRaw).trim();
          const inferredCategory = fileType === '3D Model' ? 'MODEL' : 'EXTRA';
          await prisma.projectDrawing.upsert({
            where: {
              projectId_drgNo_category: {
                projectId: Number(projectId),
                drgNo: drawingBase,
                category: inferredCategory,
              },
            },
            update: {
              fileName: originalName,
              lastAttachedAt: new Date(),
              meta: {
                fileNames: [originalName],
                storagePath: destinationPath,
                size: fileSize,
                source: 'upload-extra-3d',
                logType: `${fileType.toUpperCase()}_${logType}`,
              },
            },
            create: {
              clientId,
              projectId: Number(projectId),
              drgNo: drawingBase,
              category: inferredCategory,
              fileName: originalName,
              lastAttachedAt: new Date(),
              meta: {
                fileNames: [originalName],
                storagePath: destinationPath,
                size: fileSize,
                source: 'upload-extra-3d',
                logType: `${fileType.toUpperCase()}_${logType}`,
              },
            },
          });
        } catch (e) {
          console.warn('[upload-extra-3d] ProjectDrawing upsert failed, attempting API fallback:', e?.message || e);
          try {
            const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            await fetch(`${origin}/api/project-drawings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId,
                projectId: Number(projectId),
                entries: [{
                  drgNo: String(originalName).replace(/\.[^/.]+$/, '').trim() || originalName,
                  category: fileType === '3D Model' ? 'MODEL' : 'EXTRA',
                  revision: null,
                  fileNames: [originalName],
                  issueDate: new Date().toISOString().slice(0,10),
                }]
              })
            });
          } catch (fallbackErr) {
            console.warn('[upload-extra-3d] Fallback /api/project-drawings failed:', fallbackErr?.message || fallbackErr);
          }
        }

        return NextResponse.json({
          message: alreadyExists ? 'File replaced' : 'Uploaded successfully',
          record: created,
          fileUrl: destinationPath,
        });
      } catch (logErr) {
        console.error('Failed to log document upload:', logErr.message || logErr);
        return NextResponse.json({ error: 'Upload succeeded but logging failed' }, { status: 207 });
      }
    }

    return NextResponse.json({ error: "Invalid content type. Expected multipart/form-data" }, { status: 400 });
  } catch (err) {
    console.error("❌ API error in /api/upload-extra-3d POST:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}