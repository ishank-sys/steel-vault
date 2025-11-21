import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getGCSStorage } from "@/lib/gcs";

const prisma = new PrismaClient();
const GCS_BUCKET = process.env.GCS_BUCKET;
const SIGNED_URL_EXP_MIN = Number(process.env.SIGNED_URL_EXP_MIN || 15);

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc = await prisma.documentLog.findUnique({ where: { id: Number(id) } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const objectPath = doc.storagePath; // we store objectPath like 'clients/1-.../file.pdf'
    if (!objectPath) return NextResponse.json({ error: "No object path for this file" }, { status: 400 });

    // Basic safety check
    if (objectPath.includes("..") || !objectPath.startsWith("clients/")) {
      return NextResponse.json({ error: "Invalid object path" }, { status: 400 });
    }

    const expiresAt = Date.now() + SIGNED_URL_EXP_MIN * 60 * 1000;
    const storage = getGCSStorage();
    const [url] = await storage
      .bucket(GCS_BUCKET)
      .file(objectPath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAt,
        responseDisposition: `attachment; filename="${doc.fileName.replace(/\"/g, "\'")}"`,
      });

    return NextResponse.json({ url, expiresAt: new Date(expiresAt).toISOString() });
  } catch (err) {
    console.error("Failed to create signed url:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
