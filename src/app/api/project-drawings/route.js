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
    const clientQuoted = clientActual ? `"${clientActual}"` : null;
    const projectQuoted = projectActual ? `"${projectActual}"` : null;
    const packageQuoted = packageActual ? `"${packageActual}"` : null;
    const metadataQuoted = metadataActual ? `"${metadataActual}"` : null;
    const titleQuoted = titleActual ? `"${titleActual}"` : null;
    const statusQuoted = statusActual ? `"${statusActual}"` : null;

    // Prepare a consistent insert column list
    const insertColsRaw = [
      clientQuoted,
      projectQuoted,
      packageQuoted, // may be null; we'll still include and pass null values
      drawingQuoted,
      catQuoted,
      titleQuoted,   // optional
      'revision',
      '"issueDate"',
      '"fileName"',
      ...(lower.get('drgno') ? ['"drgNo"'] : []),
      statusQuoted,  // optional
      metadataQuoted, // optional
      'meta',
      '"lastAttachedAt"',
      '"clientRowId"'
    ].filter(Boolean);

    const conflictCols = [projectQuoted, drawingQuoted, catQuoted].filter(Boolean);
    if (conflictCols.length < 3) {
      return NextResponse.json({ error: 'Missing conflict columns' }, { status: 500 });
    }

    // Normalize and validate entries once
    const norm = entries.map((e) => {
      const drawingKey = String(e?.drawingNumber ?? e?.drawingNo ?? e?.drgNo ?? '').trim();
      const category = String(e?.category ?? '').trim();
      if (!drawingKey) return null;
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
        drawingKey,
        category,
        revision: revisionTrimmed,
        issueDate,
        fileNamesStr,
        fileNamesArr,
        clientRowId,
        titleVal,
        statusVal,
        metadataVal,
      };
    }).filter(Boolean);

    if (!norm.length) {
      return NextResponse.json({ error: 'No valid entries to insert' }, { status: 400 });
    }

    // Build VALUES tuples with numbered placeholders to avoid SQL object stringification issues
    const params = [];
    const hasClient = !!clientQuoted;
    const hasProject = !!projectQuoted;
    const hasPackage = !!packageQuoted;
    const hasTitle = !!titleQuoted;
    const hasDrgNo = !!lower.get('drgno');
    const hasStatus = !!statusQuoted;
    const hasMetadata = !!metadataQuoted;

    const pushParam = (val, cast) => {
      const idx = params.length + 1;
      params.push(val);
      return cast ? `$${idx}::${cast}` : `$${idx}`;
    };

    const valueTuplesSql = norm.map((r) => {
      const parts = [];
      if (hasClient) parts.push(pushParam(clientId));
      if (hasProject) parts.push(pushParam(projectId));
      if (hasPackage) parts.push(pushParam(packageId));
      parts.push(pushParam(r.drawingKey));
      parts.push(pushParam(r.category));
      if (hasTitle) parts.push(pushParam(r.titleVal));
      parts.push(pushParam(r.revision));
      parts.push(pushParam(r.issueDate, 'date'));
      parts.push(pushParam(r.fileNamesStr));
      if (hasDrgNo) parts.push(pushParam(r.drawingKey));
      if (hasStatus) parts.push(pushParam(r.statusVal));
      if (hasMetadata) parts.push(pushParam(JSON.stringify(r.metadataVal), 'jsonb'));
      parts.push(pushParam(JSON.stringify({ fileNames: r.fileNamesArr }), 'jsonb'));
      parts.push(pushParam(nowIso, 'timestamptz'));
      parts.push(pushParam(r.clientRowId));
      return `(${parts.join(', ')})`;
    }).join(', ');

    const insertColsSql = insertColsRaw.join(', ');
    const conflictSql = conflictCols.join(', ');

    const updateSets = [
      `${catQuoted} = EXCLUDED.${catQuoted}`,
      ...(titleQuoted ? [`${titleQuoted} = EXCLUDED.${titleQuoted}`] : []),
      `revision = EXCLUDED.revision`,
      `"issueDate" = EXCLUDED."issueDate"`,
      `"fileName" = EXCLUDED."fileName"`,
      ...(statusQuoted ? [`${statusQuoted} = EXCLUDED.${statusQuoted}`] : []),
      ...(metadataQuoted ? [`${metadataQuoted} = EXCLUDED.${metadataQuoted}`] : []),
      `meta = EXCLUDED.meta`,
      `"lastAttachedAt" = EXCLUDED."lastAttachedAt"`,
      `"updatedAt" = NOW()`
    ];
    if (packageQuoted) {
      // Update packageId on conflict when provided; keep existing when not
      updateSets.splice(3, 0, `${packageQuoted} = COALESCE(EXCLUDED.${packageQuoted}, "${table}".${packageQuoted})`);
    }

    const sql = `
      INSERT INTO "${table}" (${insertColsSql})
      VALUES ${valueTuplesSql}
      ON CONFLICT (${conflictSql})
      DO UPDATE SET ${updateSets.join(', ')}
      RETURNING (xmax = 0) AS inserted;
    `;

    const result = await prisma.$queryRawUnsafe(sql, ...params);
    const total = Array.isArray(result) ? result.length : 0;
    const created = Array.isArray(result) ? result.filter((r) => r?.inserted === true).length : 0;
    const updated = Math.max(total - created, 0);
    return NextResponse.json({ success: true, created, updated, total });
  } catch (e) {
    console.error('/api/project-drawings POST error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
