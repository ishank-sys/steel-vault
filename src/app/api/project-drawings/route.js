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
      // Also ensure unique index for (projectId, drgNo, category) to support Prisma upsert
      const drgNoActual = lower.get('drgno');
      if (drgNoActual && projectQuoted) {
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "${table}_unique_conflict_drgno"
          ON "${table}" (${projectQuoted}, "${drgNoActual}", ${catQuoted});
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
  const hasFinitePackage = packageId != null && Number.isFinite(packageId);
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
  if (hasFinitePackage && packageActual) { whereParts.push(`"${packageActual}" = $${idx++}`); args.push(packageId); }
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
    let upserts = 0;
    const { lower } = await getColumnsMap(table);
    const drawingActual = lower.get('drawingnumber') || lower.get('drgno') || 'drawingNumber';
    const drawingQuoted = `"${drawingActual}"`;
    const { quoted: catQuoted } = await getCategoryColumn(table);
    const clientActual = lower.get('clientid') || lower.get('client_id');
    const projectActual = lower.get('projectid') || lower.get('project_id');
    const packageActual = lower.get('packageid') || lower.get('package_id');
    const statusActual = lower.get('status');
    const metadataActual = lower.get('metadata');
    const filePathActual = lower.get('filepath') || lower.get('file_path');
    const titleActual = lower.get('title');
    const clientQuoted = clientActual ? `"${clientActual}"` : null;
    const projectQuoted = projectActual ? `"${projectActual}"` : null;
    const packageQuoted = packageActual ? `"${packageActual}"` : null;
    const statusQuoted = statusActual ? `"${statusActual}"` : null;
    const metadataQuoted = metadataActual ? `"${metadataActual}"` : null;
    const filePathQuoted = filePathActual ? `"${filePathActual}"` : null;
    const titleQuoted = titleActual ? `"${titleActual}"` : null;
    const conflictCols = [projectQuoted, drawingQuoted, catQuoted].filter(Boolean);
    const queries = [];
    for (const e of entries) {
      const drawingKey = String(e?.drawingNumber ?? e?.drawingNo ?? e?.drgNo ?? '').trim();
      if (!drawingKey) continue;
      const category = (e?.category ?? '').toString();
      const revision = (e?.rev ?? e?.revision ?? null);
      const revisionTrimmed = typeof revision === 'string' ? revision.trim() : revision;
      // issueDate can be provided as ISO string or 'YYYY-MM-DD'; default to today if not supplied
      const issueDate = e?.issueDate ? String(e.issueDate) : new Date().toISOString().slice(0,10);
      const fileNames = e?.fileNames ?? [];
      const clientRowId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const titleVal = e?.title ?? e?.item ?? null;
      const statusVal = 'IN_PROGRESS';
      const metadataVal = { fileNames, revision: revisionTrimmed ?? null, issueDate };

      const cols = [];
      const params = [];
      const values = [];
      let idx = 1;
      if (clientQuoted) { cols.push(clientQuoted); params.push(`$${idx++}`); values.push(clientId); }
      if (projectQuoted) { cols.push(projectQuoted); params.push(`$${idx++}`); values.push(projectId); }
  if (packageQuoted && packageId != null) { cols.push(packageQuoted); params.push(`$${idx++}`); values.push(packageId); }
      cols.push(drawingQuoted); params.push(`$${idx++}`); values.push(drawingKey);
      cols.push(catQuoted); params.push(`$${idx++}`); values.push(category);
      if (titleQuoted) { cols.push(titleQuoted); params.push(`$${idx++}`); values.push(titleVal); }
  cols.push('revision'); params.push(`$${idx++}`); values.push(revisionTrimmed);
      cols.push('"issueDate"'); params.push(`$${idx++}`); values.push(issueDate);
  cols.push('"fileName"'); params.push(`$${idx++}`); values.push(fileNames.join(', '));
  // If drgNo column exists, keep it in sync with drawingNumber for Prisma-model compatibility
  if (lower.get('drgno')) { cols.push('"drgNo"'); params.push(`$${idx++}`); values.push(drawingKey); }
      if (statusQuoted) { cols.push(statusQuoted); params.push(`$${idx++}`); values.push(statusVal); }
      if (filePathQuoted && e?.filePath) { cols.push(filePathQuoted); params.push(`$${idx++}`); values.push(e.filePath); }
      if (metadataQuoted) { cols.push(metadataQuoted); params.push(`$${idx++}`); values.push(JSON.stringify(metadataVal)); }
      cols.push('meta'); params.push(`$${idx++}`); values.push(JSON.stringify({ fileNames }));
      cols.push('"lastAttachedAt"'); params.push(`$${idx++}`); values.push(nowIso);
      cols.push('"clientRowId"'); params.push(`$${idx++}`); values.push(clientRowId);

      const castedParams = params.map((p, i) => {
        const col = cols[i];
        if (col === '"lastAttachedAt"') return `${p}::timestamptz`;
        if (col === '"issueDate"') return `${p}::date`;
        // Ensure JSONB casts where applicable
        if (col === 'meta' || (metadataQuoted && col === metadataQuoted)) return `${p}::jsonb`;
        return p;
      });
      const updateSets = [
        `${catQuoted} = EXCLUDED.${catQuoted}`,
        ...(titleQuoted ? [`${titleQuoted} = EXCLUDED.${titleQuoted}`] : []),
        'revision = EXCLUDED.revision',
        '"issueDate" = EXCLUDED."issueDate"',
        '"fileName" = EXCLUDED."fileName"',
        ...(statusQuoted ? [`${statusQuoted} = EXCLUDED.${statusQuoted}`] : []),
        // Qualify target table column to avoid ambiguity when similarly named columns exist
        ...(filePathQuoted ? [`${filePathQuoted} = COALESCE(EXCLUDED.${filePathQuoted}, "${table}".${filePathQuoted})`] : []),
        ...(metadataQuoted ? [`${metadataQuoted} = EXCLUDED.${metadataQuoted}`] : []),
        'meta = EXCLUDED.meta',
        '"lastAttachedAt" = EXCLUDED."lastAttachedAt"',
        '"updatedAt" = NOW()'
      ];
      if (packageQuoted) {
        // ensure packageId gets updated on conflict when provided; fully-qualify target column to avoid ambiguity
        updateSets.splice(3, 0, `${packageQuoted} = COALESCE(EXCLUDED.${packageQuoted}, "${table}".${packageQuoted})`);
      }
      const sql = `INSERT INTO "${table}" (${cols.join(', ')})
                   VALUES (${castedParams.join(', ')})
                   ON CONFLICT (${conflictCols.join(', ')})
                   DO UPDATE SET
                     ${updateSets.join(',\n                     ')};`;
      queries.push({ sql, values });
    }
    // Execute with targeted error reporting for easier debugging
    for (const q of queries) {
      try {
        await prisma.$executeRawUnsafe(q.sql, ...q.values);
        upserts++;
      } catch (err) {
        console.error('[project-drawings] upsert failed:', err?.message || err, '\nCode:', err?.code, '\nSQL:', q.sql, '\nValues:', q.values);
        // Fallback path: use Prisma upsert against Prisma schema (drgNo/meta)
        try {
          if (!Array.isArray(entries) || entries.length === 0) throw err;
          let fallbackUpserts = 0;
          const fallbackErrors = [];
          for (const e of entries) {
            const drgNo = String(e?.drawingNumber ?? e?.drawingNo ?? e?.drgNo ?? '').trim();
            if (!drgNo) continue;
            const category = (e?.category ?? null);
            const revision = e?.rev ?? e?.revision ?? null;
            const fileNames = Array.isArray(e?.fileNames) ? e.fileNames : [];
            const issueDate = e?.issueDate ? String(e.issueDate) : new Date().toISOString().slice(0,10);
            const metaObj = { fileNames, revision, issueDate };
            const item = e?.title ?? e?.item ?? null;
            try {
              await prisma.projectDrawing.upsert({
                where: { projectId_drgNo_category: { projectId: Number(projectId), drgNo, category } },
                create: {
                  clientId: Number(clientId),
                  projectId: Number(projectId),
                  drgNo,
                  category,
                  revision,
                  fileName: fileNames.join(', '),
                  lastAttachedAt: new Date(),
                  meta: metaObj,
                  item,
                },
                update: {
                  category,
                  revision,
                  fileName: fileNames.join(', '),
                  lastAttachedAt: new Date(),
                  meta: metaObj,
                  item,
                }
              });
              fallbackUpserts++;
            } catch (perr) {
              fallbackErrors.push(perr?.message || String(perr));
            }
          }
          if (fallbackUpserts > 0) {
            return NextResponse.json({ upserts: fallbackUpserts, fallback: 'prisma', errors: fallbackErrors });
          }
          // If fallback produced no upserts, surface both raw and fallback errors
          return NextResponse.json({
            error: err?.message || String(err),
            code: err?.code,
            sql: q.sql,
            values: q.values,
            fallback: 'prisma',
            fallbackErrors,
          }, { status: 500 });
        } catch (inner) {
          return NextResponse.json({
            error: err?.message || String(err),
            code: err?.code,
            sql: q.sql,
            values: q.values,
            fallbackError: inner?.message || String(inner)
          }, { status: 500 });
        }
      }
    }
    return NextResponse.json({ upserts });
  } catch (e) {
    console.error('/api/project-drawings POST error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
