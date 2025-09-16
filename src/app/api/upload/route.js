import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getGCSStorage } from "@/lib/gcs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const prisma = new PrismaClient();

const toIntOrNull = (v) => {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
// Ensure this is defined before any usage. If you change .env, restart your server!
const GCS_BUCKET = process.env.GCS_BUCKET;
// --- LOGGING ENDPOINT FOR DIRECT GCS UPLOADS AND MULTIPART HANDLER ---
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      // Direct log request (from client after GCS PUT)
      try {
        const body = await req.json();
        const { clientId, projectId, originalName, storagePath, size, logType } = body;
        let record = null;
        try {
          await prisma.documentLog.create({
            data: {
              fileName: originalName,
              clientId: clientId ?? null,
              projectId: projectId ?? null,
              storagePath,
              size,
              logType: logType || "EMPLOYEE_UPLOAD",
            },
          });
          record = await prisma.documentLog.findFirst({ where: { storagePath } });
        } catch (e) {
          console.error("Failed to log upload:", e && e.message ? e.message : e);
        }
        try {
          await prisma.upload.create({
            data: {
              clientId: clientId ?? null,
              filename: originalName,
              storagePath,
              size,
            },
          });
        } catch (e) {
          console.warn("Could not persist upload metadata:", e && e.message ? e.message : e);
        }
        return NextResponse.json({ message: "Logged", record });
      } catch (err) {
        return NextResponse.json({ error: err && err.message ? err.message : String(err) }, { status: 500 });
      }
    }

    // ---- multipart upload path ----
    if (contentType.includes("multipart/form-data")) {
      if (!GCS_BUCKET) {
        return NextResponse.json({ error: "GCS_BUCKET not configured" }, { status: 500 });
      }

      const formData = await req.formData();
      const file = formData.get("file");

      // Accept either explicit IDs or infer like code 1 (via header)
      const rawClientId = formData.get("clientId");
      const rawProjectId = formData.get("projectId");
      const userEmail = req.headers.get("x-user-email") || undefined;

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Resolve clientId:
      // 1) use provided clientId if valid
      // 2) else infer from user email like code 1
      let clientId = toIntOrNull(rawClientId);
      if (!clientId && userEmail) {
        try {
          const user = await prisma.user.findUnique({ where: { email: userEmail } });
          if (user && user.clientId) clientId = user.clientId;
        } catch {
          // ignore
        }
      }

      // Resolve projectId if present
      const projectId = toIntOrNull(rawProjectId);

      // ---- folder logic (parity with code 1) ----
      // client folder: clients/{id}-{name}
      let clientFolder = clientId ? `clients/${clientId}` : "clients/unknown";
      try {
        if (clientId) {
          const client = await prisma.client.findUnique({ where: { id: clientId } });
          if (client) {
            const raw = client.name || client.companyName || `client-${client.id}`;
            clientFolder = `clients/${client.id}-${slugify(raw)}`;
          }
        }
      } catch {
        console.warn("Could not resolve client name; using id fallback");
      }

      // project folder: {id}-{name}
      let projectFolder = "";
      try {
        if (projectId) {
          const project = await prisma.project.findUnique({ where: { id: projectId } });
          if (project) {
            const raw = project.name || `project-${project.id}`;
            projectFolder = `${project.id}-${slugify(raw)}`;
          }
        }
      } catch {
        console.warn("Could not resolve project name; using id fallback");
      }

      // destination path (generic upload — no hardcoded subfolder)
      const originalName = file.name || `upload-${Date.now()}`;
      const destName = `${Date.now()}_${originalName}`;
      const destinationPath = `${clientFolder}/${projectFolder}/${destName}`.replace(/\/+/g, "/");

      // ---- GCS stream upload (no Buffer, no browser involvement) ----
      const storage = getGCSStorage();
      const bucket = storage.bucket(GCS_BUCKET);
      const gcsFile = bucket.file(destinationPath);

      // optional: check existence for logging
      let alreadyExists = false;
      try {
        const [exists] = await gcsFile.exists();
        alreadyExists = !!exists;
      } catch {
        // ignore
      }

      const nodeStream = Readable.fromWeb(file.stream());
      const writeStream = gcsFile.createWriteStream({
        resumable: false,
        contentType: file.type || "application/octet-stream",
      });

      const abortHandler = () => {
        try { if (nodeStream && nodeStream.destroy) nodeStream.destroy(); } catch {}
        try { if (writeStream && writeStream.destroy) writeStream.destroy(); } catch {}
      };
      if (req.signal && req.signal.addEventListener) {
        req.signal.addEventListener("abort", abortHandler);
      }

      try {
        await pipeline(nodeStream, writeStream);
      } finally {
        if (req.signal && req.signal.removeEventListener) {
          req.signal.removeEventListener("abort", abortHandler);
        }
      }

      const objectPath = destinationPath;
      const size = file.size || null;

      // Log to documentLog (never pass NaN)
      let record = null;
      try {
        await prisma.documentLog.create({
          data: {
            fileName: originalName,
            clientId: clientId ?? null,
            projectId: projectId ?? null,
            storagePath: objectPath,
            size,
            logType: alreadyExists ? "NAVIGATE_EXISTING" : "EMPLOYEE_UPLOAD",
          },
        });
        record = await prisma.documentLog.findFirst({ where: { storagePath: objectPath } });
      } catch (e) {
        console.error("Failed to log upload:", e && e.message ? e.message : e);
      }

      // Optional side table
      try {
        await prisma.upload.create({
          data: {
            clientId: clientId ?? null,
            filename: originalName,
            storagePath: `gs://${GCS_BUCKET}/${objectPath}`,
            size,
          },
        });
      } catch (e) {
        console.warn("Could not persist upload metadata:", e && e.message ? e.message : e);
      }

      // ✅ Return only metadata (no GCS URL)
      return NextResponse.json({
        message: alreadyExists ? "File replaced/navigated" : "Uploaded",
        path: objectPath,
        record,
      });
    }

    // ---- legacy JSON user-create path (kept) ----
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
        isRelieved: body.isRelieved ?? false,
        relievedDate: body.relievedDate ? new Date(body.relievedDate) : null,
      },
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error("❌ API error in /api/upload POST:", err && err.message ? err.message : err);
    return NextResponse.json({ error: (err && err.message) || "Unexpected error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: err && err.message ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: `✅ User ${id} deleted` });
  } catch (err) {
    console.error("❌ Error deleting user:", err && err.message ? err.message : err);
    return NextResponse.json({ error: (err && err.message) || "Unexpected error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    const updatedUser = await prisma.user.update({ where: { id: body.id }, data: body });
    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error("❌ Error updating user:", err && err.message ? err.message : err);
    return NextResponse.json({ error: (err && err.message) || "Unexpected error" }, { status: 500 });
  }
}
