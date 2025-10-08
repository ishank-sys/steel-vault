import { NextResponse } from 'next/server';
import { getGCSStorage } from '@/lib/gcs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ error: 'GCS_BUCKET not configured' }, { status: 500 });
    }

    const storage = getGCSStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 10 });
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Failed to create download link' }, { status: 500 });
  }
}
