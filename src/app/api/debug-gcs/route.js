export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskKey(key) {
  if (!key) return null;
  // show only last 8 chars for safety
  const s = key.replace(/\n/g, '\\n');
  if (s.length <= 12) return '***';
  return '***' + s.slice(-8);
}

export async function GET() {
  try {
    const rawCredJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCS_CREDENTIALS_JSON || null;
    let parsed = null;
    let parseError = null;
    if (rawCredJson) {
      try {
        parsed = JSON.parse(rawCredJson);
      } catch (e1) {
        try {
          const decoded = Buffer.from(rawCredJson, 'base64').toString('utf8');
          parsed = JSON.parse(decoded);
        } catch (e2) {
          parseError = `json_parse_failed: ${e1.message}; base64_parse_failed: ${e2.message}`;
        }
      }
    }

    const hasIndividual = !!(process.env.GCS_PRIVATE_KEY && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PROJECT_ID);

    const out = {
      env: {
        GCS_BUCKET: !!process.env.GCS_BUCKET,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        GCS_CREDENTIALS_JSON: !!process.env.GCS_CREDENTIALS_JSON,
        GCS_PRIVATE_KEY: !!process.env.GCS_PRIVATE_KEY,
        GCS_CLIENT_EMAIL: !!process.env.GCS_CLIENT_EMAIL,
        GCS_PROJECT_ID: !!process.env.GCS_PROJECT_ID,
        DEBUG_GCS: process.env.DEBUG_GCS || null,
        NODE_ENV: process.env.NODE_ENV || null,
      },
      parsedCredentials: parsed
        ? {
            type: parsed.type || null,
            project_id: parsed.project_id || null,
            client_email: parsed.client_email || null,
            private_key: maskKey(parsed.private_key),
          }
        : null,
      parseError,
      hasIndividual,
    };

    // If individual env creds are present, show masked private key info
    if (hasIndividual) {
      out.individual = {
        GCS_PROJECT_ID: process.env.GCS_PROJECT_ID || null,
        GCS_CLIENT_EMAIL: process.env.GCS_CLIENT_EMAIL || null,
        GCS_PRIVATE_KEY: maskKey(process.env.GCS_PRIVATE_KEY),
      };
    }

    return new Response(JSON.stringify(out, null, 2), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
