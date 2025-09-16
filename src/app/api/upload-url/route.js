import { getGCSStorage } from '@/lib/gcs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storage = getGCSStorage();
const GCS_BUCKET = process.env.GCS_BUCKET;

const setCORSHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
};

// Updated signed URL generation logic to exclude unnecessary headers
export async function POST(req) {
  try {
    const { filename, contentType, clientId, projectId } = await req.json();

    if (!GCS_BUCKET) {
      return new Response(JSON.stringify({ error: 'GCS_BUCKET not configured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const now = Date.now();
    const destName = `${now}_${filename}`;
    const clientFolder = `clients/${clientId ?? 'unknown'}`;
    const projectFolder = `${projectId ?? 'unknown'}`;
    const destinationPath = `${clientFolder}/${projectFolder}/${destName}`;

    try {
      const [url] = await storage
        .bucket(GCS_BUCKET)
        .file(destinationPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
          // Only include headers that will be sent
          headers: { host: 'storage.googleapis.com' },
        });

      return new Response(JSON.stringify({ uploadUrl: url, destinationPath }), {
        headers: { 'content-type': 'application/json' },
      });
    } catch (gcsErr) {
      return new Response(JSON.stringify({ error: 'Failed to generate signed URL', debug: gcsErr.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function OPTIONS() {
  const response = new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  return response;
}
