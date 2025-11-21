import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
// --- LOGGING ENDPOINT FOR DIRECT GCS UPLOADS (JSON ONLY) OR JOB ENQUEUEING ---
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    
    // Handle multipart/form-data for background job enqueueing
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const clientId = formData.get("clientId");
      const projectId = formData.get("projectId");
      const packageId = formData.get("packageId");
      const packageName = formData.get("packageName");
      const logType = formData.get("logType") || "EMPLOYEE_UPLOAD";
      const subFolder = formData.get("subFolder");
      const fileType = formData.get("fileType");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Convert file to base64 for job payload
      const arrayBuffer = await file.arrayBuffer();
      const fileBase64 = Buffer.from(arrayBuffer).toString('base64');

      // Enqueue upload job
      const job = await prisma.job.create({
        data: {
          type: "upload-file",
          payload: {
            fileBase64,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            clientId,
            projectId,
            packageId,
            packageName,
            logType,
            subFolder,
            fileType,
          },
        },
      });

      return NextResponse.json({ 
        message: "Upload job enqueued", 
        jobId: job.id,
        status: "queued" 
      });
    }

    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Supported content types: application/json (for logging) or multipart/form-data (for uploads)" }, { status: 415 });
    }

    // Direct log request (from client after GCS PUT)
  const body = await req.json();
  const { clientId, projectId, packageId, packageName, originalName, storagePath, size, logType } = body;
    if (!originalName || !storagePath) {
      return NextResponse.json({ error: "originalName and storagePath are required" }, { status: 400 });
    }

    const cleanClientId = typeof clientId === "string" ? parseInt(clientId, 10) : Number(clientId);
  const cleanProjectId = typeof projectId === "string" ? parseInt(projectId, 10) : Number(projectId);
  const cleanPackageId = packageId != null ? (typeof packageId === "string" ? parseInt(packageId, 10) : Number(packageId)) : null;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[upload] payload', { clientId, projectId, packageId, packageName, cleanClientId, cleanProjectId, cleanPackageId, originalName, storagePath, size, logType });
    }

    // Enforce non-null clientId/projectId per schema requirements
    if (!Number.isFinite(cleanClientId) || !Number.isFinite(cleanProjectId)) {
      return NextResponse.json({ error: "clientId and projectId are required and must be numeric" }, { status: 400 });
    }

    // Verify that clientId exists in the Client table before creating DocumentLog
    let clientVerifyWarning = null;
    try {
      const clientExists = await prisma.client.findUnique({ where: { id: cleanClientId } });
      if (!clientExists) {
        return NextResponse.json({ error: `Client with ID ${cleanClientId} does not exist` }, { status: 400 });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      clientVerifyWarning = msg;
      console.warn("/api/upload: warning, DB error verifying client existence (will continue):", msg);
    }

    // Verify that projectId exists in the Project table
    let projectVerifyWarning = null;
    try {
      const projectExists = await prisma.project.findUnique({ where: { id: cleanProjectId } });
      if (!projectExists) {
        return NextResponse.json({ error: `Project with ID ${cleanProjectId} does not exist` }, { status: 400 });
      }
    } catch (e) {
      const msg = e?.message || String(e);
      projectVerifyWarning = msg;
      console.warn("/api/upload: warning, DB error verifying project existence (will continue):", msg);
    }

    // Strip any gs://bucket/ prefix from storagePath when logging in DocumentLog
    const normalizedPath = String(storagePath).replace(/^gs:\/\/[^/]+\//, "");

    // Prisma Int is 32-bit signed; clamp extremely large sizes
    let normSize = Number(size);
    if (!Number.isFinite(normSize) || normSize < 0) normSize = 0;
    const INT_MAX = 2147483647;
    if (normSize > INT_MAX) normSize = INT_MAX;

    let record;
    try {
      record = await prisma.documentLog.create({
        data: {
          fileName: originalName,
          clientId: cleanClientId,
          projectId: cleanProjectId,
          storagePath: normalizedPath,
          size: normSize,
          logType: logType || "EMPLOYEE_UPLOAD",
        },
      });
    } catch (e) {
      const msg = e?.message || String(e);
      console.error("/api/upload: failed to create DocumentLog:", msg);
      const extra = [];
      if (clientVerifyWarning) extra.push(`clientVerifyWarning=${clientVerifyWarning}`);
      if (projectVerifyWarning) extra.push(`projectVerifyWarning=${projectVerifyWarning}`);
      return NextResponse.json({ error: process.env.NODE_ENV !== 'production' ? `Failed to log upload: ${msg}${extra.length ? ' | ' + extra.join(' | ') : ''}` : 'Failed to log upload' }, { status: 500 });
    }

    // Also upsert into ProjectDrawing so filenames appear in the DB for the project
    // Prefer the internal /api/project-drawings endpoint (handles schema drift and packageId)
    // If that fails, do a minimal Prisma upsert without packageId
    // Derive a drawing number from the file name (strip extension)
      const drawingBaseRaw = String(originalName).replace(/\.[^\/\.]+$/, '').trim() || String(originalName);
      const drawingBase = (String(drawingBaseRaw).split('-')[0] || drawingBaseRaw).trim();
    // Infer a loose category from the path if available; default to empty string
    let inferredCategory = '';
    if (/design-drawings\//i.test(normalizedPath)) inferredCategory = 'A';
    else if (/3d-models\//i.test(normalizedPath)) inferredCategory = 'MODEL';
    else if (/extras\//i.test(normalizedPath)) inferredCategory = 'EXTRA';

    let pdLogged = false;
    try {
      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const resp = await fetch(`${origin}/api/project-drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: cleanClientId,
          projectId: cleanProjectId,
          packageId: cleanPackageId ?? undefined,
          entries: [{
            drgNo: drawingBase,
            category: inferredCategory,
            revision: null,
            fileNames: [originalName],
            issueDate: new Date().toISOString().slice(0,10),
          }]
        })
      });
      pdLogged = resp.ok;
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        console.warn('[upload] /api/project-drawings returned', resp.status, t);
      }
    } catch (fallbackErr) {
      console.warn('[upload] call to /api/project-drawings failed:', fallbackErr?.message || fallbackErr);
    }
    if (!pdLogged) {
      // We previously attempted a direct Prisma upsert as a fallback here.
      // To keep a single authoritative code path for ProjectDrawing writes
      // and to avoid schema-drift/upsert races, rely on the internal API
      // `/api/project-drawings`. If that call failed earlier (pdLogged=false)
      // it likely already logged an error; surface a warning and proceed.
      console.warn('[upload] /api/project-drawings did not acknowledge logging; skipping direct DB upsert to maintain single write path');
    }

    // Optional: maintain separate upload table if present
    try {
      if (prisma && typeof prisma.upload === "object" && typeof prisma.upload.create === "function") {
        await prisma.upload.create({
          data: {
            clientId: cleanClientId,
            filename: originalName,
            storagePath: storagePath,
            size: normSize,
          },
        });
      } else {
        console.warn("upload table insert skipped: prisma.upload model not available");
      }
    } catch (e) {
      console.warn("upload table insert skipped:", e?.message || e);
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

    return NextResponse.json(serializeForJson({ message: "Logged", record }));
  } catch (err) {
    console.error("❌ API error in /api/upload POST:", err && err.message ? err.message : err);
    return NextResponse.json({ error: (err && err.message) || "Unexpected error" }, { status: 500 });
  }
}
// Remove GET/PUT/DELETE user handlers from this route to keep it single-purpose
