import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getGCSStorage } from "../../lib/gcs";

const prisma = new PrismaClient();
const GCS_BUCKET = process.env.GCS_BUCKET;

// POST → handle either JSON user-create (legacy) or multipart file upload
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
      const clientId = formData.get("clientId") || "unknown";
      const projectId = formData.get("projectId") || "unknown";

      // --- Unified folder logic ---
      // Get client folder: clients/{clientId}-{clientName}
      let clientFolder = `clients/${String(clientId)}`;
      let clientNameSafe = '';
      try {
        const clientRecord = await prisma.client.findUnique({ where: { id: Number(clientId) } });
        if (clientRecord) {
          const raw = clientRecord.name || clientRecord.companyName || `client-${clientRecord.id}`;
          clientNameSafe = String(raw)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);
          clientFolder = `clients/${clientRecord.id}-${clientNameSafe}`;
        }
      } catch (e) {
        console.warn('Could not resolve client name for folder; using id fallback', e?.message || e);
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

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const originalName = file.name || `upload-${Date.now()}`;
      const destName = `${Date.now()}_${originalName}`;
      // No design-drawings subfolder for generic upload
      const destinationPath = `${clientFolder}/${projectFolder}/${destName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const bucket = storage.bucket(GCS_BUCKET);
      const gcsFile = bucket.file(destinationPath);

      await gcsFile.save(buffer, {
        resumable: false,
        contentType: file.type || 'application/octet-stream',
      });

      // Keep bucket private. Save object path to DB (not a public URL).
      const objectPath = destinationPath;

      try {
        await prisma.documentLog.create({
          data: {
            fileName: originalName,
            clientId: clientId ? Number(clientId) : null,
            projectId: projectId ? Number(projectId) : null,
            storagePath: objectPath,
            size: buffer.length,
            logType: 'EMPLOYEE_UPLOAD',
          },
        });
      } catch (logErr) {
        console.error('Failed to log upload:', logErr.message || logErr);
      }

      // Return the created document log record if possible so the UI can request signed URLs
      let createdRecord = null;
      try {
        createdRecord = await prisma.documentLog.findFirst({ where: { storagePath: objectPath } });
      } catch (e) {
        console.warn('Could not fetch created document log:', e?.message || e);
      }

      // Optionally: persist metadata in DB (not required, but useful)
      try {
        await prisma.upload.create({
          data: {
            clientId: clientId ? Number(clientId) : null,
            filename: originalName,
            storagePath: `gs://${GCS_BUCKET}/${destinationPath}`,
            size: buffer.length,
          },
        });
      } catch (dbErr) {
        console.warn('Could not persist upload metadata:', dbErr.message || dbErr);
      }

      return NextResponse.json({
        message: 'Uploaded',
        path: objectPath,
        record: createdRecord,
      });
    }

    // Fallback: existing JSON user-create behavior
    const body = await req.json();

    const newUser = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        department: body.department,
        designation: body.designation,
        empPassword: body.empPassword,
        empId: body.empId,
        companyEmpId: body.companyEmpId,
        gender: body.gender,
        isRelieved: body.isRelieved || false,
        relievedDate: body.relievedDate ? new Date(body.relievedDate) : null,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error("❌ API error in /api/upload POST:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keep existing GET/DELETE/PUT behaviour for user management
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id"), 10);

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: `✅ User ${id} deleted` });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: body.id },
      data: body,
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("❌ Error updating user:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

