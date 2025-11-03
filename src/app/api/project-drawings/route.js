import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { Prisma } from '@prisma/client';

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
      title TEXT,
      item TEXT,
      category TEXT NOT NULL DEFAULT '',
      revision TEXT,
      "issueDate" DATE,
      "fileName" TEXT,
      "status" TEXT,
      "filePath" TEXT,
      metadata JSONB,
      "lastAttachedAt" TIMESTAMPTZ,
      "clientRowId" TEXT,
      meta JSONB,
      -- Versioning columns (kept optional for compatibility)
      version INTEGER DEFAULT 1,
      superseded_by BIGINT,
      lineage_key TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // Ensure compatibility columns exist if table was created previously with a different schema
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS title TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS category TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "clientId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "projectId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS item TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS revision TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "packageId" INTEGER;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "issueDate" DATE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "fileName" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "status" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "filePath" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS metadata JSONB;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "lastAttachedAt" TIMESTAMPTZ;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "clientRowId" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS meta JSONB;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();`);
  // Compatibility with Prisma model (drgNo)
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "drgNo" TEXT;`);
  // Versioning support columns (if missing)
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS superseded_by BIGINT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS lineage_key TEXT;`);
  try { await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "drgNo" = "drawingNumber" WHERE "drgNo" IS NULL AND "drawingNumber" IS NOT NULL;`); } catch {}
  // Drop NOT NULL on optional columns to avoid 23502 if legacy schema marked them NOT NULL
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "packageId" DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN title DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN item DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN revision DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "fileName" DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "status" DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "filePath" DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN metadata DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN meta DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "lastAttachedAt" DROP NOT NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "clientRowId" DROP NOT NULL;`); } catch {}
  // Set sane defaults for required-like fields if they exist
  try { await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "status" = 'IN_PROGRESS' WHERE "status" IS NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';`); } catch {}
  try { await prisma.$executeRawUnsafe(`UPDATE "${table}" SET metadata = '{}'::jsonb WHERE metadata IS NULL;`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;`); } catch {}
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
    const packageActual = lower.get('packageid') || lower.get('package_id');
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno');

    // Drop legacy unique indexes that block history
    try { await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${table}_unique_conflict";`); } catch {}
    try { await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${table}_unique_conflict_drgno";`); } catch {}
    // Also drop potential constraint names created by earlier schemas (both drgNo and drawingNumber variants)
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_projectId_drawingNumber_category_key";`); } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_projectid_drawingnumber_category_key";`); } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_projectId_drgNo_category_key";`); } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_projectid_drgno_category_key";`); } catch {}
    // Best-effort dynamic drop for any unique index on (projectId, drawingNumber, category)
    try {
      await prisma.$executeRawUnsafe(`DO $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN (
          SELECT i.indexname AS name
          FROM pg_indexes i
          WHERE i.schemaname = 'public' AND i.tablename = '${table}'
            AND (i.indexdef ILIKE '%("projectId", "drawingNumber", "category")%'
              OR i.indexdef ILIKE '%(projectId, drawingNumber, category)%')
        ) LOOP
          EXECUTE format('DROP INDEX IF EXISTS %I', rec.name);
        END LOOP;
      END$$;`);
    } catch {}
    // Dynamic drop for any unique index on (projectId, drgNo, category)
    try {
      await prisma.$executeRawUnsafe(`DO $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN (
          SELECT i.indexname AS name
          FROM pg_indexes i
          WHERE i.schemaname = 'public' AND i.tablename = '${table}'
            AND (i.indexdef ILIKE '%("projectId", "drgNo", "category")%'
              OR i.indexdef ILIKE '%(projectId, drgNo, category)%')
        ) LOOP
          EXECUTE format('DROP INDEX IF EXISTS %I', rec.name);
        END LOOP;
      END$$;`);
    } catch {}
    // And any unique constraint referencing the same three columns
    try {
      await prisma.$executeRawUnsafe(`DO $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN (
          SELECT conname AS name
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE c.contype = 'u' AND t.relname = '${table}'
            AND pg_get_constraintdef(c.oid) ILIKE '%("projectId", "drawingNumber", "category")%'
        ) LOOP
          BEGIN
            EXECUTE format('ALTER TABLE "${table}" DROP CONSTRAINT %I', rec.name);
          EXCEPTION WHEN others THEN NULL;
          END;
        END LOOP;
      END$$;`);
    } catch {}
    try {
      await prisma.$executeRawUnsafe(`DO $$
      DECLARE
        rec RECORD;
      BEGIN
        FOR rec IN (
          SELECT conname AS name
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE c.contype = 'u' AND t.relname = '${table}'
            AND pg_get_constraintdef(c.oid) ILIKE '%("projectId", "drgNo", "category")%'
        ) LOOP
          BEGIN
            EXECUTE format('ALTER TABLE "${table}" DROP CONSTRAINT %I', rec.name);
          EXCEPTION WHEN others THEN NULL;
          END;
        END LOOP;
      END$$;`);
    } catch {}

    // Create partial unique index to allow history but enforce a single ACTIVE (non-superseded) row per key
    if (projectActual && drawingActual) {
      const projectQuoted = `"${projectActual}"`;
      const drawingQuoted = `"${drawingActual}"`;
      if (packageActual) {
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "${table}_active_unique_key"
          ON "${table}" (${projectQuoted}, "${packageActual}", ${drawingQuoted})
          WHERE superseded_by IS NULL;
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "${table}_active_unique_key_no_pkg"
          ON "${table}" (${projectQuoted}, ${drawingQuoted})
          WHERE superseded_by IS NULL;
        `);
      }
      // Helpful supporting indexes
      try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${table}_project_idx" ON "${table}" (${projectQuoted});`); } catch {}
      if (packageActual) {
        try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${table}_package_idx" ON "${table}" ("${packageActual}");`); } catch {}
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
  const hasFinitePackage = packageId != null && Number.isFinite(packageId);
    const all = searchParams.get('all'); // when truthy, include history (superseded rows)
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
    const hasSupersede = lower.has('superseded_by');
    const whereParts = [];
    const args = [];
    let idx = 1;
  if (projectActual) { whereParts.push(`"${projectActual}" = $${idx++}`); args.push(projectId); }
  if (hasFinitePackage && packageActual) { whereParts.push(`"${packageActual}" = $${idx++}`); args.push(packageId); }
    // Default to only ACTIVE (non-superseded) rows unless ?all=1
    if (hasSupersede && !(all === '1' || all === 'true' || all === 'yes')) {
      whereParts.push(`superseded_by IS NULL`);
    }
    // Optional drawing equality filter on either drawingNumber or drgNo
    if (drawingFilter) {
      const drawingActual = lower.get('drawingnumber') || lower.get('drgno');
      if (drawingActual) {
        whereParts.push(`"${drawingActual}" = $${idx++}`);
        args.push(drawingFilter);
      }
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    let rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" ${whereSql} ORDER BY ${drawingQuoted} ASC`,
      ...args
    );
    // Fallback: if filtering by packageId yields no rows (legacy data may have NULL packageId), try project-only
    if (Array.isArray(rows) && rows.length === 0 && hasFinitePackage && packageActual) {
      try {
        const whereParts2 = [];
        const args2 = [];
        let idx2 = 1;
        if (projectActual) { whereParts2.push(`"${projectActual}" = $${idx2++}`); args2.push(projectId); }
        const whereSql2 = whereParts2.length ? `WHERE ${whereParts2.join(' AND ')}` : '';
        rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${table}" ${whereSql2} ORDER BY ${drawingQuoted} ASC`,
          ...args2
        );
      } catch {}
    }
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
    const today = new Date().toISOString().slice(0, 10);
    const { lower } = await getColumnsMap(table);
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno') || 'drawingNumber';
    const drawingQuoted = `"${drawingActual}"`;
    const { quoted: catQuoted } = await getCategoryColumn(table);
    const clientActual = lower.get('clientid') || lower.get('client_id');
    const projectActual = lower.get('projectid') || lower.get('project_id');
    const packageActual = lower.get('packageid') || lower.get('package_id');
    const metadataActual = lower.get('metadata');
    const titleActual = lower.get('title');
    const statusActual = lower.get('status');
    const hasDrgNo = !!lower.get('drgno');
    const hasSupersede = lower.has('superseded_by');

    // Normalize input entries
    const norm = entries.map((e) => {
      const drawingKey = String(e?.drawingNumber ?? e?.drawingNo ?? e?.drgNo ?? '').trim();
      if (!drawingKey) return null;
      const category = String(e?.category ?? '').trim();
      const revision = (e?.rev ?? e?.revision ?? null);
      const revisionTrimmed = typeof revision === 'string' ? revision.trim() : revision;
      const issueDate = e?.issueDate ? String(e.issueDate) : today;
      const fileNamesArr = Array.isArray(e?.fileNames) ? e.fileNames : (e?.fileNames ? [e.fileNames] : []);
      const fileNamesStr = fileNamesArr.map((s) => String(s)).join(', ');
      const clientRowId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const titleVal = e?.title ?? e?.item ?? null;
      const statusVal = 'IN_PROGRESS';
      const metadataVal = { fileNames: fileNamesArr, revision: revisionTrimmed ?? null, issueDate };
      return {
        drawingKey, category, revision: revisionTrimmed, issueDate,
        fileNamesStr, fileNamesArr, clientRowId, titleVal, statusVal, metadataVal,
      };
    }).filter(Boolean);

    if (!norm.length) return NextResponse.json({ error: 'No valid entries to insert' }, { status: 400 });

    let created = 0;
    let superseded = 0;

    for (const r of norm) {
      await prisma.$transaction(async (tx) => {
        // 1) Find existing ACTIVE row for this (projectId, packageId, drawing) and lock it
        const whereParts = [];
        const args = [];
        let idx = 1;
        if (projectActual) { whereParts.push(`"${projectActual}" = $${idx++}`); args.push(projectId); }
        if (packageActual) {
          if (packageId == null) { whereParts.push(`"${packageActual}" IS NULL`); }
          else { whereParts.push(`"${packageActual}" = $${idx++}`); args.push(packageId); }
        }
        whereParts.push(`${drawingQuoted} = $${idx++}`); args.push(r.drawingKey);
        if (hasSupersede) whereParts.push(`superseded_by IS NULL`);
        const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        const existingRows = await tx.$queryRawUnsafe(`SELECT id FROM "${table}" ${whereSql} FOR UPDATE`, ...args);
        const prevId = Array.isArray(existingRows) && existingRows[0] ? Number(existingRows[0].id) : null;

        // 2) If previous exists, mark it temporarily as non-active to satisfy partial unique index
        if (prevId && hasSupersede) {
          await tx.$executeRawUnsafe(`UPDATE "${table}" SET superseded_by = -1, "status" = 'SUSPENDED', "updatedAt" = NOW() WHERE id = $1`, prevId);
        }

        // 3) Insert new ACTIVE row
        const cols = [];
        const vals = [];
        const params = [];
        const push = (val, cast) => { const i = params.length + 1; params.push(val); vals.push(cast ? `$${i}::${cast}` : `$${i}`); };

        if (clientActual) cols.push(`"${clientActual}"`), push(clientId);
        if (projectActual) cols.push(`"${projectActual}"`), push(projectId);
        if (packageActual) cols.push(`"${packageActual}"`), push(packageId);
        cols.push(drawingQuoted); push(r.drawingKey);
        cols.push(catQuoted); push(r.category);
        if (titleActual) cols.push(`"${titleActual}"`), push(r.titleVal);
        cols.push('revision'); push(r.revision);
        cols.push('"issueDate"'); push(r.issueDate, 'date');
        cols.push('"fileName"'); push(r.fileNamesStr);
        if (hasDrgNo) cols.push('"drgNo"'), push(r.drawingKey);
        if (statusActual) cols.push(`"${statusActual}"`), push(r.statusVal);
        if (metadataActual) cols.push(`"${metadataActual}"`), push(JSON.stringify(r.metadataVal), 'jsonb');
        cols.push('meta'); push(JSON.stringify({ fileNames: r.fileNamesArr }), 'jsonb');
        cols.push('"lastAttachedAt"'); push(nowIso, 'timestamptz');
        cols.push('"clientRowId"'); push(r.clientRowId);

        const insertSql = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING id;`;
        const ins = await tx.$queryRawUnsafe(insertSql, ...params);
        const newId = Array.isArray(ins) && ins[0] ? Number(ins[0].id) : null;
        if (newId) created++;

        // 4) Finalize supersede: set previous.superseded_by = newId
        if (newId && prevId && hasSupersede) {
          await tx.$executeRawUnsafe(`UPDATE "${table}" SET superseded_by = $1, "updatedAt" = NOW() WHERE id = $2`, newId, prevId);
          superseded++;
        }
      });
    }

    return NextResponse.json({ success: true, created, superseded, total: created });
  } catch (e) {
    console.error('/api/project-drawings POST error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
