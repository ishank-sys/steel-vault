import { prisma } from '../src/lib/prisma.js';

async function main() {
  const ACTIVE = new Set(['Live', 'PLANNING', 'IN_PROGRESS']);
  const COMPLETED = new Set(['COMPLETED']);

  // 1. Sanitize any legacy NULL json fields that are now non-nullable in Prisma.
  const jsonFixStatements = [
    `UPDATE "public"."Client" SET "attachments"='[]'::jsonb WHERE "attachments" IS NULL;`,
    `UPDATE "public"."Client" SET "configuration"='{}'::jsonb WHERE "configuration" IS NULL;`,
    `UPDATE "public"."Client" SET "ccListData"='[]'::jsonb WHERE "ccListData" IS NULL;`,
    `UPDATE "public"."Client" SET "folderStructure"='{}'::jsonb WHERE "folderStructure" IS NULL;`
  ];
  for (const sql of jsonFixStatements) {
    try { await prisma.$executeRawUnsafe(sql); } catch (e) { console.warn('JSON field fix failed:', e.message); }
  }

  // 2. Use groupBy to get counts per client & status
  const grouped = await prisma.project.groupBy({
    by: ['clientId', 'status'],
    _count: { _all: true }
  });

  // 3. Aggregate counts
  const agg = new Map();
  for (const row of grouped) {
    const { clientId, status } = row;
    const bucket = agg.get(clientId) || { total: 0, active: 0, completed: 0 };
    bucket.total += row._count._all;
    if (ACTIVE.has(status)) bucket.active += row._count._all;
    if (COMPLETED.has(status)) bucket.completed += row._count._all;
    agg.set(clientId, bucket);
  }

  // 4. Update each client (only numeric counters)
  for (const [clientId, counts] of agg.entries()) {
    try {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          totalProjects: counts.total,
            activeProjects: counts.active,
            completedProjects: counts.completed
        }
      });
      console.log(`Client ${clientId} => total:${counts.total} active:${counts.active} completed:${counts.completed}`);
    } catch (e) {
      console.error(`Failed updating client ${clientId}:`, e.message);
    }
  }

  // Also zero out any clients with no projects to keep consistency.
  const allClients = await prisma.client.findMany({ select: { id: true } });
  for (const c of allClients) {
    if (!agg.has(c.id)) {
      await prisma.client.update({
        where: { id: c.id },
        data: { totalProjects: 0, activeProjects: 0, completedProjects: 0 }
      });
      console.log(`Client ${c.id} => total:0 active:0 completed:0`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
