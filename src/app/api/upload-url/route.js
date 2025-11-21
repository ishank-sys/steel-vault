import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma.js";
import { getGCSStorage } from "@/lib/gcs";

const GCS_BUCKET = process.env.GCS_BUCKET;
const GCS_BUCKET = process.env.GCS_BUCKET;

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);

export async function POST(req) {
  try {
    const { filename, contentType, clientId, projectId } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
    }

    // Build folders similar to your server route (lightweight; no heavy DB lookups)
    let clientFolder = clientId ? `clients/${clientId}` : "clients/unknown";
    try {
      if (clientId) {
        const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });
        if (client?.name) clientFolder = `clients/${client.id}-${slugify(client.name)}`;
      }
    } catch {}

    let projFolder = "";
    try {
      if (projectId) {
        const proj = await prisma.project.findUnique({ where: { id: Number(projectId) } });
        if (proj) projFolder = `${proj.id}-${slugify(proj.name || `project-${proj.id}`)}`;
      }
    } catch {}

    const destName = `${Date.now()}_${filename}`;
    const destinationPath = `${clientFolder}/${projFolder}/${destName}`.replace(/\/+/g, "/");

    const storage = getGCSStorage();
    const file = storage.bucket(GCS_BUCKET).file(destinationPath);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000, // 10 min
      contentType,                            // MUST match the header used in PUT
    });

    return NextResponse.json({ uploadUrl, destinationPath });
  } catch (e) {
    console.error("upload-url error:", e);
    return NextResponse.json({ error: e.message || "failed to sign url" }, { status: 500 });
  }
}
