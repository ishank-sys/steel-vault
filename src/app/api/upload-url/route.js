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

    // Basic credential presence hints to help debugging in preview environments
    const hasCredJson = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCS_CREDENTIALS_JSON);
    const hasIndividualCreds = !!(process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PROJECT_ID);

    try {
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
    } catch (gcsErr) {
      const debug = {
        hasCredJson,
        hasIndividualCreds,
        bucket: !!GCS_BUCKET,
        message: gcsErr?.message,
        code: gcsErr?.code || null,
      };
      // If DEBUG_GCS=1 expose stack and raw error for easier troubleshooting in preview logs
      if (process.env.DEBUG_GCS === '1') {
        debug.stack = gcsErr?.stack;
        debug.raw = Object.keys(gcsErr || {}).reduce((acc, k) => { acc[k] = gcsErr[k]; return acc; }, {});
      }
      return new Response(JSON.stringify({ error: 'Failed to generate signed URL', debug }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
