import { prisma } from "../prisma.js";

// Normalize drawing number: remove any suffix after the first hyphen.
// Example: 'E101-RA' -> 'E101'
export function normalizeDrgNo(raw) {
  if (raw === undefined || raw === null) return raw;
  const s = String(raw).trim();
  if (!s) return s;
  const parts = s.split("-");
  const base = parts[0].trim();
  return base || s;
}

// Helper to run a function inside a transaction with a project-level advisory lock
export async function withProjectLock(projectId, fn) {
  return await prisma.$transaction(async (tx) => {
    try {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock($1)",
        Number(projectId)
      );
    } catch (e) {
      // ignore lock acquisition errors here; let DB surface them if any
    }
    return await fn(tx);
  });
}

// Batch upsert drawings: entries is array of { clientId, projectId, packageId, drgNo, category, revision, fileNames, issueDate }
export async function batchUpsertDrawings(entries = []) {
  console.log(
    "[projectDrawingsService] batchUpsertDrawings called with",
    JSON.stringify(entries, null, 2),
    "entries"
  );
  console.log("=".repeat(80));
  if (!Array.isArray(entries) || entries.length === 0)
    return { created: 0, superseded: 0 };

  const projectIdFromFirst = entries[0].projectId;
  if (projectIdFromFirst == null) throw new Error("projectId required");

  return await withProjectLock(projectIdFromFirst, async (tx) => {
    let created = 0;
    let superseded = 0;

    // NOTE: Revision must be provided by the import source (excel sheet).
    // We no longer auto-calculate revisions here. If an incoming entry
    // does not include a non-empty `revision` we will skip it so upstream
    // data must provide the value.

    for (const e of entries) {
      try {
        // Determine primary incoming filename (preferred source for drgNo if not provided)
        const incomingPrimaryFile =
          (Array.isArray(e.fileNames) && e.fileNames[0]) || e.fileName || null;

        // Revised drgNo logic:
        // 1. If entry contains drgNo -> use it (after normalize)
        // 2. Else parse from primary filename using normalizeDrgNo
        // 3. If still missing/empty -> skip the entry (no auto-generation)
        let drgNo = null;
        if (e.drgNo != null && String(e.drgNo).trim() !== "") {
          drgNo = normalizeDrgNo(e.drgNo);
        } else if (incomingPrimaryFile) {
          drgNo = normalizeDrgNo(incomingPrimaryFile);
        }

        // Validate required fields: clientId, projectId, drgNo. packageId is optional (legacy data may use NULL)
        const missing = [];
        if (e.clientId == null) missing.push("clientId");
        if (e.projectId == null) missing.push("projectId");
        if (drgNo == null || String(drgNo).trim() === "") missing.push("drgNo");

        if (missing.length) {
          try {
            console.warn(
              "[projectDrawingsService] skipping drawing entry missing required fields ->",
              {
                missing,
                entry: {
                  clientId: e.clientId,
                  projectId: e.projectId,
                  packageId: e.packageId,
                  providedDrgNo: e.drgNo ?? null,
                  incomingPrimaryFile,
                  resolvedDrgNo: drgNo,
                  category: e.category,
                },
              }
            );
          } catch (logErr) {
            // ignore logging errors
          }
          continue; // skip this entry
        }

        // Normalize category for insert (optional)
        const categoryVal =
          e.category != null && String(e.category).trim() !== ""
            ? String(e.category).trim()
            : null;

        // Build WHERE clause to locate existing active drawing (same compound unique set)
        const whereParts = [];
        const params = [];
        let idx = 1;

        whereParts.push(`"projectId" = $${idx++}`);
        params.push(e.projectId);
        // packageId may be NULL in legacy data: match IS NULL when incoming packageId is null
        if (e.packageId == null) {
          whereParts.push(`"packageId" IS NULL`);
        } else {
          whereParts.push(`"packageId" = $${idx++}`);
          params.push(e.packageId);
        }
        whereParts.push(`"clientId" = $${idx++}`);
        params.push(e.clientId);
        whereParts.push(`"drgNo" = $${idx++}`);
        params.push(drgNo);
        whereParts.push(`superseded_by IS NULL`);
        const whereSql = whereParts.join(" AND ");


        // Fetch any existing active rows for this drgNo (could be multiple)
        const existingRows = await tx.$queryRawUnsafe(
          `SELECT id, revision FROM "ProjectDrawing" WHERE ${whereSql} FOR UPDATE`,
          ...params
        );
        const prevRows = Array.isArray(existingRows) ? existingRows : [];

        // Determine max existing revision (to set prevRev) but do NOT auto-generate
        let maxRev = null;
        for (const r of prevRows) {
          try {
            if (r && r.revision) {
              const rev = String(r.revision).toUpperCase().replace(/[^A-Z]/g, '');
              if (rev && (maxRev == null || rev.length > maxRev.length || (rev.length === maxRev.length && rev > maxRev))) {
                maxRev = rev;
              }
            }
          } catch (ignore) {}
        }
        // Require incoming revision from the Excel import. Skip entry if missing.
        const providedRevision = e.revision && String(e.revision).trim() !== '' ? String(e.revision).trim() : null;
        if (!providedRevision) {
          try {
            console.warn('[projectDrawingsService] skipping drawing entry missing revision ->', { entry: { clientId: e.clientId, projectId: e.projectId, packageId: e.packageId, drgNo, incomingPrimaryFile } });
          } catch (logErr) {}
          continue;
        }
        const newRevision = providedRevision;

        // Build create data strictly from provided fields and parsed drgNo
        const createData = {
          clientId: e.clientId,
          projectId: e.projectId,
          packageId: e.packageId,
          drgNo,
          revision: newRevision,
          prevRev: maxRev,
          issueDate: e.issueDate ? new Date(String(e.issueDate)) : null,
          fileName: incomingPrimaryFile || null,
          status: "IN_PROGRESS",
          meta: {
            revision: newRevision,
            fileNames: e.fileNames || [],
            issueDate: e.issueDate || null,
          },
          metadata: {
            revision: newRevision,
            fileNames: e.fileNames || [],
            issueDate: e.issueDate || null,
          },
          lastAttachedAt: new Date(),
        };
        if (categoryVal != null) createData.category = categoryVal;

        // Debug log of insertion target
        try {
          console.debug("[projectDrawingsService] inserting drawing ->", {
            clientId: createData.clientId,
            projectId: createData.projectId,
            packageId: createData.packageId,
            drgNo: createData.drgNo,
            category: createData.category ?? null,
            revision: createData.revision,
            fileName: createData.fileName,
            meta: createData.meta,
          });
        } catch (logErr) {
          // ignore logging errors
        }

        const createdRow = await tx.projectDrawing.create({ data: createData, select: { id: true } });
        const newId = createdRow && createdRow.id ? Number(createdRow.id) : null;
        if (newId) created++;

        // Mark all previous active rows as superseded and set status to VOID
        if (newId && prevRows.length) {
          const ids = prevRows.map((r) => Number(r.id)).filter(Boolean);
          if (ids.length) {
            // Use a parameterized UPDATE for all ids
            const idParams = ids.map((_, i) => `$${i + 1}`).join(',');
            await tx.$executeRawUnsafe(
              `UPDATE "ProjectDrawing" SET superseded_by = $${ids.length + 1}, status = 'VOID', "updatedAt" = NOW() WHERE id IN (${idParams})`,
              ...ids,
              newId
            );
            superseded += ids.length;
          }
        }
      } catch (err) {
        console.warn(
          "[projectDrawingsService] entry upsert failed",
          err?.message || err
        );
        throw err;
      }
    }

    return { created, superseded, total: created };
  });
}

export async function handlePublishJob(job, prisma) {
  const payload = job.payload || {};
  const entries = Array.isArray(payload.drawings)
    ? payload.drawings.map((d) => ({
        clientId: payload.clientId || d.clientId,
        projectId: payload.projectId || d.projectId,
        packageId: payload.packageId || d.packageId,
        // allow drgNo to be provided; batchUpsertDrawings will prefer this value
        drgNo: d.drgNo || d.drawingNo || d.drawing || null,
        category: d.category || d.cat || "",
        revision: d.revision || d.rev || null,
        fileNames: d.fileNames || (d.fileName ? [d.fileName] : []),
        issueDate: d.issueDate || null,
      }))
    : [];
  if (!entries.length) return { created: 0, superseded: 0 };
  return await batchUpsertDrawings(entries);
}
