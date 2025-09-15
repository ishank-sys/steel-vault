import { getGCSStorage } from '@/lib/gcs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storage = getGCSStorage();
const GCS_BUCKET = process.env.GCS_BUCKET;

export async function POST(req) {
  try {
    const { filename, contentType, clientId, projectId } = await req.json();

    if (!GCS_BUCKET) {
      return new Response(JSON.stringify({ error: 'GCS_BUCKET not configured' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    const now = Date.now();
    const destName = `${now}_${filename}`;
    const clientFolder = `clients/${clientId ?? 'unknown'}`;
    const projectFolder = `${projectId ?? 'unknown'}`;
    const destinationPath = `${clientFolder}/${projectFolder}/${destName}`;

    const [url] = await storage
      .bucket(GCS_BUCKET)
      .file(destinationPath)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        contentType: contentType || 'application/octet-stream',
      });

    return new Response(JSON.stringify({ uploadUrl: url, destinationPath }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
