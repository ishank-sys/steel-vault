export const runtime = 'nodejs';

export async function GET() {
  const info = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    versions: {
      node: process.versions.node,
      openssl: process.versions.openssl,
      modules: process.versions.modules,
      uv: process.versions.uv
    },
    envHints: {
      hasPrismaGenerate: !!process.env.PRISMA_GENERATE_SKIP,
      databaseUrlLength: (process.env.DATABASE_URL || '').length,
    },
    timestamp: new Date().toISOString()
  };
  return new Response(JSON.stringify(info), { status: 200, headers: { 'content-type': 'application/json' } });
}
