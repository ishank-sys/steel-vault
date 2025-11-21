import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma.js';
export const runtime = 'nodejs';

// Primary client uses the deployed DATABASE_URL (likely pooled :6543)

export async function GET() {
  const start = Date.now();
  const url = process.env.DATABASE_URL || '';
  const attempts = [];

  // Helper to run a query with a specific client
  async function tryQuery(label, clientFactory) {
    const t0 = Date.now();
    try {
      const client = clientFactory();
      const result = await client.$queryRaw`SELECT 1 as ok`;
      const ms = Date.now() - t0;
      attempts.push({ label, ok: true, latencyMs: ms, result });
      return true;
    } catch (e) {
      const ms = Date.now() - t0;
      attempts.push({ label, ok: false, latencyMs: ms, error: e.message });
      return false;
    }
  }

  // Attempt 1: current env URL
  await tryQuery('primary(DATABASE_URL)', () => prisma);

  // If primary failed and looks like pooled 6543, craft fallback
  if (!attempts[0].ok && /:6543\//.test(url)) {
    // Build fallback: switch to 5432, remove pgbouncer param & pool settings
    let alt = url
      .replace(':6543/', ':5432/')
      .replace(/([?&])pgbouncer=true&?/,'$1')
      .replace(/([?&])connection_limit=\d+&?/,'$1')
      .replace(/([?&])pool_timeout=\d+&?/,'$1');
    // Clean up duplicated ?& or trailing ?
    alt = alt.replace(/\?&/g,'?').replace(/&&/g,'&').replace(/\?$/,'');

    // Ensure sslmode=require present
    if (!/sslmode=/.test(alt)) {
      alt += (alt.includes('?') ? '&' : '?') + 'sslmode=require';
    }

    await tryQuery('fallback(direct:5432)', () => new PrismaClient({ datasources: { db: { url: alt } } }));
    attempts.push({ generatedFallbackUrlSample: alt.replace(/:[^:@/]*@/,'://***:***@').slice(0,120)+'...' });
  }

  const overallOk = attempts.some(a => a.ok);
  const totalMs = Date.now() - start;

  return new Response(JSON.stringify({
    ok: overallOk,
    totalLatencyMs: totalMs,
    attempts,
    pooledDetected: /pgbouncer=true/.test(url),
    originalPort: (url.match(/:(\d+)\//)||[])[1] || null
  }), {
    status: overallOk ? 200 : 500,
    headers: { 'content-type': 'application/json' }
  });
}
