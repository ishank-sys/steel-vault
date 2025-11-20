import { prisma } from '../prisma.js';

// Helper to run a function inside a transaction with a project-level advisory lock
export async function withProjectLock(projectId, fn) {
  return await prisma.$transaction(async (tx) => {
    try {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', Number(projectId));
    } catch (e) {
      // ignore lock acquisition errors here; let DB surface them if any
    }
    return await fn(tx);
  });
}

// Batch upsert drawings: entries is array of { clientId, projectId, packageId, drgNo, category, revision, fileNames, issueDate }
export async function batchUpsertDrawings(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return { created: 0, superseded: 0 };
  const projectId = entries[0].projectId;
  if (!projectId) throw new Error('projectId required');

  return await withProjectLock(projectId, async (tx) => {
    let created = 0;
    let superseded = 0;
    for (const e of entries) {
      // minimal upsert: try to mark existing active row as superseded then insert new row
      try {
        const whereParts = [];
        const params = [];
        let idx = 1;
        whereParts.push(`"projectId" = $${idx++}`); params.push(e.projectId);
        if (e.packageId != null) { whereParts.push(`"packageId" = $${idx++}`); params.push(e.packageId); }
        whereParts.push(`"drgNo" = $${idx++}`); params.push(e.drgNo);
        whereParts.push(`superseded_by IS NULL`);
        const whereSql = whereParts.join(' AND ');

        const existing = await tx.$queryRawUnsafe(`SELECT id FROM "ProjectDrawing" WHERE ${whereSql} FOR UPDATE`, ...params);
        const prevId = Array.isArray(existing) && existing[0] ? Number(existing[0].id) : null;
        if (prevId) {
          await tx.$executeRawUnsafe(`UPDATE "ProjectDrawing" SET superseded_by = -1, "updatedAt" = NOW() WHERE id = $1`, prevId);
        }

        const cols = [];
        const vals = [];
        const params2 = [];
        const push = (v) => { params2.push(v); vals.push(`$${params2.length}`); };
        cols.push('"clientId"'); push(e.clientId);
        cols.push('"projectId"'); push(e.projectId);
        if (e.packageId != null) { cols.push('"packageId"'); push(e.packageId); }
        cols.push('"drgNo"'); push(e.drgNo);
        cols.push('category'); push(e.category || '');
        cols.push('revision'); push(e.revision || null);
        cols.push('"fileName"'); push((Array.isArray(e.fileNames) && e.fileNames[0]) || null);
        cols.push('meta'); push(JSON.stringify({ fileNames: e.fileNames || [], issueDate: e.issueDate || null }));
        cols.push('"lastAttachedAt"'); push(new Date().toISOString(), 'timestamptz');

        const insertSql = `INSERT INTO "ProjectDrawing" (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING id;`;
        const ins = await tx.$queryRawUnsafe(insertSql, ...params2);
        const newId = Array.isArray(ins) && ins[0] ? Number(ins[0].id) : null;
        if (newId) created++;
        if (newId && prevId) {
          await tx.$executeRawUnsafe(`UPDATE "ProjectDrawing" SET superseded_by = $1, "updatedAt" = NOW() WHERE id = $2`, newId, prevId);
          superseded++;
        }
      } catch (err) {
        console.warn('[projectDrawingsService] entry upsert failed', err?.message || err);
      }
    }
    return { created, superseded, total: created };
  });
}

export async function handlePublishJob(job, prisma) {
  const payload = job.payload || {};
  const entries = Array.isArray(payload.drawings) ? payload.drawings.map(d => ({
    clientId: payload.clientId || d.clientId,
    projectId: payload.projectId || d.projectId,
    packageId: payload.packageId || d.packageId,
    drgNo: d.drawingNumber || d.drgNo || d.drawingNo || d.drawing || d.drgNo || d.drgNo,
    category: d.category || d.cat || '',
    revision: d.revision || d.rev || null,
    fileNames: d.fileNames || [],
    issueDate: d.issueDate || null,
  })) : [];
  if (!entries.length) return { created: 0, superseded: 0 };
  // batchUpsertDrawings manages its own lock and tx using prisma internally
  return await batchUpsertDrawings(entries);
}

export default { withProjectLock, batchUpsertDrawings, handlePublishJob };
