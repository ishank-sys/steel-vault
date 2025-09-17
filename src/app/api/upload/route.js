import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = 'nodejs';

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
// --- LOGGING ENDPOINT FOR DIRECT GCS UPLOADS (JSON ONLY) ---
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Only application/json supported. Upload files directly to GCS using signed URL." }, { status: 415 });
    }

    // Direct log request (from client after GCS PUT)
    const body = await req.json();
    const { clientId, projectId, originalName, storagePath, size, logType } = body;
    if (!originalName || !storagePath) {
      return NextResponse.json({ error: "originalName and storagePath are required" }, { status: 400 });
    }

    const cleanClientId = typeof clientId === "string" ? parseInt(clientId, 10) : Number(clientId);
    const cleanProjectId = typeof projectId === "string" ? parseInt(projectId, 10) : Number(projectId);

    // Strip any gs://bucket/ prefix from storagePath when logging in DocumentLog
    const normalizedPath = String(storagePath).replace(/^gs:\/\/[^/]+\//, "");

    const record = await prisma.documentLog.create({
      data: {
        fileName: originalName,
        clientId: Number.isFinite(cleanClientId) ? cleanClientId : null,
        projectId: Number.isFinite(cleanProjectId) ? cleanProjectId : null,
        storagePath: normalizedPath,
        size: Number.isFinite(Number(size)) ? Number(size) : null,
        logType: logType || "EMPLOYEE_UPLOAD",
      },
    });

    // Optional: maintain separate upload table if present
    try {
      await prisma.upload.create({
        data: {
          clientId: Number.isFinite(cleanClientId) ? cleanClientId : null,
          filename: originalName,
          storagePath: storagePath,
          size: Number.isFinite(Number(size)) ? Number(size) : null,
        },
      });
    } catch (e) {
      // upload table may not exist in schema; ignore
      console.warn("upload table insert skipped:", e?.message || e);
    }

    return NextResponse.json({ message: "Logged", record });
  } catch (err) {
    console.error("❌ API error in /api/upload POST:", err && err.message ? err.message : err);
    return NextResponse.json({ error: (err && err.message) || "Unexpected error" }, { status: 500 });
  }
}
// Remove GET/PUT/DELETE user handlers from this route to keep it single-purpose
