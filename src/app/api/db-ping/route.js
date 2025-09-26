import { PrismaClient } from '@prisma/client';
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET() {
  const start = Date.now();
  try {
    // Simple lightweight query
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    const ms = Date.now() - start;
    return new Response(JSON.stringify({ ok: true, latencyMs: ms, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    const ms = Date.now() - start;
    return new Response(JSON.stringify({ ok: false, latencyMs: ms, error: err.message, stack: err.stack?.split('\n').slice(0,4) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  } finally {
    // Allow Node to reuse; don't force disconnect each invocation in serverless pooled context.
  }
}
