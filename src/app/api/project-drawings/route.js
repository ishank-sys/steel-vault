import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Safely serialize BigInt values for JSON responses
function serializeForJson(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = serializeForJson(value[k]);
    }
    return out;
  }
  return value;
}

async function getColumnsMap(table = 'ProjectDrawing') {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`
  );
  const list = Array.isArray(rows) ? rows.map(r => String(r.column_name || r.COLUMN_NAME || '')) : [];
  const lower = new Map(list.map(n => [n.toLowerCase(), n]));
  return { list, lower };
}

async function getDrawingNumberColumn(table = 'ProjectDrawing') {
  try {
    const { lower } = await getColumnsMap(table);
    if (lower.has('drawingnumber')) return { quoted: '"drawingNumber"' };
    if (lower.has('drgno')) return { quoted: '"drgNo"' };
  } catch {}
  return { quoted: '"drawingNumber"' };
}

async function getCategoryColumn(table = 'ProjectDrawing') {
  try {
    const { list } = await getColumnsMap(table);
    if (list.includes('category')) return { name: 'category', quoted: '"category"' };
    const found = list.find(n => String(n).toLowerCase() === 'category');
    if (found) return { name: found, quoted: `"${found}"` };
  } catch {}
  return { name: 'category', quoted: '"category"' };
}

// Always target ProjectDrawing (no fallback)
async function getTargetTable() { return 'ProjectDrawing'; }

async function ensureTable(forceTable) {
  const table = forceTable || await getTargetTable();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${table}" (
      id SERIAL PRIMARY KEY,
      "clientId" INTEGER NOT NULL REFERENCES "Client"(id) ON DELETE CASCADE,
      "projectId" INTEGER NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
      "packageId" INTEGER,
      "drawingNumber" TEXT NOT NULL,
      item TEXT,
      category TEXT NOT NULL DEFAULT '',
      revision TEXT,
      "fileName" TEXT,
      "lastAttachedAt" TIMESTAMPTZ,
      "clientRowId" TEXT,
      meta JSONB,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS category TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "clientId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "projectId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS item TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS revision TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "packageId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "fileName" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "lastAttachedAt" TIMESTAMPTZ;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "clientRowId" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS meta JSONB;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();`);
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.table_name = '${table}' AND tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_name = '${table}_client_fkey'
        ) THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "${table}_client_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.table_name = '${table}' AND tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_name = '${table}_project_fkey'
        ) THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "${table}_project_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch {}
  const { quoted: catQuoted } = await getCategoryColumn(table);
  await prisma.$executeRawUnsafe(`UPDATE "${table}" SET ${catQuoted} = '' WHERE ${catQuoted} IS NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN ${catQuoted} SET DEFAULT '';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN ${catQuoted} SET NOT NULL;`);
  try {
    const { lower } = await getColumnsMap(table);
    const projectActual = lower.get('projectid') || lower.get('project_id');
    const projectQuoted = projectActual ? `"${projectActual}"` : null;
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno');
    if (drawingActual) {
      const drawingQuoted = `"${drawingActual}"`;
      const conflictCols = [projectQuoted, drawingQuoted, catQuoted].filter(Boolean).join(', ');
      if (conflictCols) {
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "${table}_unique_conflict"
          ON "${table}" (${conflictCols});
        `);
      }
    }
  } catch (e) {
    console.warn('[project-drawings] index ensure skipped:', e?.message || e);
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get('projectId'));
    const packageId = searchParams.get('packageId') != null ? Number(searchParams.get('packageId')) : null;
    const drawingFilter = searchParams.get('drawing');
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    const table = await getTargetTable();
    await ensureTable(table);
    const { lower } = await getColumnsMap(table);
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno');
    const drawingQuoted = drawingActual ? `"${drawingActual}"` : '"drawingNumber"';
    const projectActual = lower.get('projectid') || lower.get('project_id');
    const packageActual = lower.get('packageid') || lower.get('package_id');
    const whereParts = [];
    const args = [];
    let idx = 1;
    if (projectActual) { whereParts.push(`"${projectActual}" = $${idx++}`); args.push(projectId); }
    if (packageId != null && packageActual) { whereParts.push(`"${packageActual}" = $${idx++}`); args.push(packageId); }
    // Optional drawing equality filter on either drawingNumber or drgNo
    if (drawingFilter) {
      const drawingActual = lower.get('drawingnumber') || lower.get('drgno');
      if (drawingActual) {
        whereParts.push(`"${drawingActual}" = $${idx++}`);
        args.push(drawingFilter);
      }
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" ${whereSql} ORDER BY ${drawingQuoted} ASC`,
      ...args
    );
    return NextResponse.json(serializeForJson(rows || []));
  } catch (e) {
    console.error('/api/project-drawings GET error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const clientId = Number(body?.clientId);
    const projectId = Number(body?.projectId);
    const packageId = body?.packageId != null ? Number(body.packageId) : null;
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    if (!Number.isFinite(clientId) || !Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'clientId and projectId are required and numeric' }, { status: 400 });
    }
    if (!entries.length) {
      return NextResponse.json({ error: 'entries array is required' }, { status: 400 });
    }

    const table = await getTargetTable();
    await ensureTable(table);

    const nowIso = new Date().toISOString();
    let upserts = 0;
    const { lower } = await getColumnsMap(table);
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno') || 'drawingNumber';
    const drawingQuoted = `"${drawingActual}"`;
    const { quoted: catQuoted } = await getCategoryColumn(table);
    const clientActual = lower.get('clientid') || lower.get('client_id');
    const projectActual = lower.get('projectid') || lower.get('project_id');
    const packageActual = lower.get('packageid') || lower.get('package_id');
    const clientQuoted = clientActual ? `"${clientActual}"` : null;
    const projectQuoted = projectActual ? `"${projectActual}"` : null;
    const packageQuoted = packageActual ? `"${packageActual}"` : null;
    const conflictCols = [projectQuoted, drawingQuoted, catQuoted].filter(Boolean);
    for (const e of entries) {
      const drawingKey = String(e?.drawingNumber ?? e?.drawingNo ?? e?.drgNo ?? '').trim();
      if (!drawingKey) continue;
      const category = (e?.category ?? '').toString();
      const revision = e?.rev ?? e?.revision ?? null;
      const clientRowId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);

      const cols = [];
      const params = [];
      const values = [];
      let idx = 1;
      if (clientQuoted) { cols.push(clientQuoted); params.push(`$${idx++}`); values.push(clientId); }
      if (projectQuoted) { cols.push(projectQuoted); params.push(`$${idx++}`); values.push(projectId); }
      if (packageQuoted && packageId != null) { cols.push(packageQuoted); params.push(`$${idx++}`); values.push(packageId); }
      cols.push(drawingQuoted); params.push(`$${idx++}`); values.push(drawingKey);
      cols.push(catQuoted); params.push(`$${idx++}`); values.push(category);
      cols.push('revision'); params.push(`$${idx++}`); values.push(revision);
      cols.push('"lastAttachedAt"'); params.push(`$${idx++}`); values.push(nowIso);
      cols.push('"clientRowId"'); params.push(`$${idx++}`); values.push(clientRowId);

      const castedParams = params.map((p, i) => (cols[i] === '"lastAttachedAt"' ? `${p}::timestamptz` : p));
      const sql = `INSERT INTO "${table}" (${cols.join(', ')})
                   VALUES (${castedParams.join(', ')})
                   ON CONFLICT (${conflictCols.join(', ')})
                   DO UPDATE SET
                     ${catQuoted} = EXCLUDED.${catQuoted},
                     revision = EXCLUDED.revision,
                     "lastAttachedAt" = EXCLUDED."lastAttachedAt",
                     "updatedAt" = NOW();`;
      await prisma.$executeRawUnsafe(sql, ...values);
      upserts++;
    }
    return NextResponse.json({ upserts });
  } catch (e) {
    console.error('/api/project-drawings POST error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
