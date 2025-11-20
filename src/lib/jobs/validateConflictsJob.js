export async function handleValidateConflicts(job, prisma) {
  const payload = job.payload || {};
  const projectId = Number(payload.projectId);
  const packageId = payload.packageId != null ? Number(payload.packageId) : null;
  const drawingKeys = Array.isArray(payload.drawingKeys) ? payload.drawingKeys : [];
  const fetchAll = !!payload.fetchAll;
  if (!projectId) return { conflicts: [], rows: [] };
  if (fetchAll) {
    const params = [projectId];
    let sql = `SELECT * FROM "ProjectDrawing" WHERE "projectId" = $1 AND superseded_by IS NULL`;
    if (packageId) {
      params.push(packageId);
      sql = `SELECT * FROM "ProjectDrawing" WHERE "projectId" = $1 AND "packageId" = $2 AND superseded_by IS NULL`;
    }
    let rows = [];
    try { rows = await prisma.$queryRawUnsafe(sql, ...params); } catch (e) { rows = []; }
    const map = {};
    for (const row of rows) {
      const dr = row.drgNo || row.drawingNumber || '';
      const cat = row.category || '';
      const { normDr, normCat } = (() => {
        const normalizeToken = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const stripFrTrSuffix = (token) => { if (!token) return token; const up = token.toUpperCase(); if (up.endsWith('FR') || up.endsWith('TR')) return up.slice(0, -2); return up; };
        const normalizeCategory = (c) => { const cc = String(c || '').trim().toUpperCase(); if (!cc) return ''; if (cc === 'A' || cc === 'G' || cc === 'W') return cc; if (cc.startsWith('SHOP') || cc === 'S') return 'A'; if (cc.startsWith('ERECTION') || cc === 'E' || cc === 'GA' || cc.includes('GENERAL')) return 'G'; if (cc.includes('PART') || cc.includes('COMPONENT') || cc === 'P') return 'W'; return cc[0] || ''; };
        const nd = stripFrTrSuffix(normalizeToken(dr)); const nc = normalizeCategory(cat); return { normDr: nd, normCat: nc };
      })();
      const key = `${normDr}::${normCat}`;
      const revVal = String(row.revision || row.rev || '').trim();
      const ts = new Date(row.updatedAt || row.updated_at || row.lastAttachedAt || 0).getTime();
      const prev = map[key];
      if (!prev || ts > prev._ts) {
        map[key] = { rev: revVal, _ts: ts };
        const keyNoCat = normDr;
        const prev2 = map[keyNoCat];
        if (!prev2 || ts > prev2._ts) map[keyNoCat] = { rev: revVal, _ts: ts };
        const fns = [];
        if (row.meta) {
          try { const obj = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta; if (obj && Array.isArray(obj.fileNames)) fns.push(...obj.fileNames); } catch {}
        }
        if (row.fileName && typeof row.fileName === 'string') fns.push(...row.fileName.split(/\s*,\s*/).filter(Boolean));
        for (const name of fns) {
          const k = `file::${String(name).trim().toLowerCase()}`;
          const prevF = map[k];
          if (!prevF || ts > prevF._ts) map[k] = { rev: revVal, _ts: ts };
        }
      }
    }
    const out = {};
    for (const k of Object.keys(map)) out[k] = map[k].rev ?? '';
    return { conflicts: [], rows, prevRevMap: out };
  }
  if (!drawingKeys.length) return { conflicts: [] };
  const placeholders = drawingKeys.map((_, i) => `$${i+1}`).join(', ');
  const sql = `SELECT "drgNo", "category", revision, "fileName" FROM "ProjectDrawing" WHERE "projectId" = $${drawingKeys.length + 1} AND superseded_by IS NULL AND "drgNo" IN (${placeholders})`;
  const params = [...drawingKeys, projectId];
  let rows = [];
  try { rows = await prisma.$queryRawUnsafe(sql, ...params); } catch (e) { rows = []; }
  const map = {};
  for (const r of rows) { const key = String(r.drgNo || '').trim(); map[key] = { rev: r.revision || null, fileName: r.fileName || null }; }
  const conflicts = drawingKeys.map(k => ({ drgNo: k, prev: map[k] || null }));
  return { conflicts };
}

export default { handleValidateConflicts };
