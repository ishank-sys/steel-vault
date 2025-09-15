import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const GCS_BUCKET = process.env.GCS_BUCKET;

export async function POST(req) {
  try {
    if (!GCS_BUCKET) return NextResponse.json({ error: 'GCS_BUCKET not configured' }, { status: 500 });

    const body = await req.json();
    const { path, action = 'read', expiresSeconds = 300 } = body || {};
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });

    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(path);

    const [url] = await file.getSignedUrl({
      action,
      expires: Date.now() + expiresSeconds * 1000,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Error creating signed url', err);
    return NextResponse.json({ error: err.message || 'failed' }, { status: 500 });
  }
}
