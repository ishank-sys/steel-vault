import { NextResponse } from "next/server";
import { getGCSStorage } from "@/lib/gcs";

const GCS_BUCKET = process.env.GCS_BUCKET;

export async function GET(req) {
  try {
    const storage = getGCSStorage();
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing file path" }, { status: 400 });
    }
    if (!GCS_BUCKET) {
      return NextResponse.json({ error: "GCS_BUCKET not configured" }, { status: 500 });
    }
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 10, // 10 minutes
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
