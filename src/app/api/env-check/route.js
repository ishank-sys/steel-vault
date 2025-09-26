export const runtime = 'nodejs';

// Simple environment diagnostics (sanitized) to verify variables exist in the deployed runtime.
export async function GET() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GCS_PROJECT_ID',
    'GCS_CLIENT_EMAIL'
  ];

  const present = {};
  for (const key of required) {
    const val = process.env[key];
    if (val) {
      // Partial masking for secrets
      present[key] = `${val.substring(0, Math.min(10, val.length))}... (${val.length} chars)`;
    } else {
      present[key] = null;
    }
  }

  // Show whether pooled connection params are present
  const db = process.env.DATABASE_URL || '';
  const pooled = /pgbouncer=true/.test(db);
  const portMatch = db.match(/:(\d+)\//);

  return new Response(
    JSON.stringify({
      ok: true,
      runtime: 'nodejs',
      timestamp: new Date().toISOString(),
      env: present,
      database: {
        pooled,
        port: portMatch ? portMatch[1] : null,
        hasSslMode: /sslmode=/.test(db),
      }
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
