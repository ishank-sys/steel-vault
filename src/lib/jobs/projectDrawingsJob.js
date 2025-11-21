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
  if (!projectIdFromFirst) throw new Error("projectId required");

  return await withProjectLock(projectIdFromFirst, async (tx) => {
    let created = 0;
    let superseded = 0;

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

        // Validate required fields strictly: clientId, projectId, packageId, drgNo
        const missing = [];
        if (e.clientId == null) missing.push("clientId");
        if (e.projectId == null) missing.push("projectId");
        if (e.packageId == null) missing.push("packageId");
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
        whereParts.push(`"packageId" = $${idx++}`);
        params.push(e.packageId);
        whereParts.push(`"clientId" = $${idx++}`);
        params.push(e.clientId);
        whereParts.push(`"drgNo" = $${idx++}`);
        params.push(drgNo);
        whereParts.push(`superseded_by IS NULL`);
        const whereSql = whereParts.join(" AND ");

        // Fetch any existing active row and lock it.
        const existing = await tx.$queryRawUnsafe(
          `SELECT id, "fileName", meta FROM "ProjectDrawing" WHERE ${whereSql} FOR UPDATE`,
          ...params
        );
        const prevRow =
          Array.isArray(existing) && existing[0] ? existing[0] : null;
        const prevId = prevRow ? Number(prevRow.id) : null;

        // Determine whether incoming primary file matches existing active row
        let prevMetaFileNames = [];
        try {
          if (
            prevRow &&
            prevRow.meta &&
            typeof prevRow.meta === "object" &&
            Array.isArray(prevRow.meta.fileNames)
          ) {
            prevMetaFileNames = prevRow.meta.fileNames.map(String);
          }
        } catch (parseErr) {
          prevMetaFileNames = [];
        }

        if (
          prevId &&
          incomingPrimaryFile &&
          (String(prevRow.fileName) === String(incomingPrimaryFile) ||
            prevMetaFileNames.includes(String(incomingPrimaryFile)) ||
            (Array.isArray(e.fileNames) &&
              e.fileNames.some(
                (fn) => String(fn) === String(prevRow.fileName)
              )))
        ) {
          // update the existing row in-place
          try {
            const updateData = {
              revision:
                e.revision && String(e.revision).trim() !== ""
                  ? String(e.revision).trim()
                  : null,
              fileName: incomingPrimaryFile || prevRow.fileName || null,
              issueDate: e.issueDate ? new Date(String(e.issueDate)) : null,
              meta: {
                fileNames: e.fileNames || [],
                issueDate: e.issueDate || null,
              },
              lastAttachedAt: new Date(),
            };
            if (categoryVal != null) updateData.category = categoryVal;
            await tx.projectDrawing.update({
              where: { id: prevId },
              data: updateData,
            });
            continue; // moved on to next entry
          } catch (updErr) {
            console.warn(
              "[projectDrawingsService] failed to update existing active drawing, falling back to create: ",
              updErr?.message || updErr
            );
            // fall through to supersede/create path
          }
        }

        // If previous active row exists, mark temporarily non-active to allow insert
        if (prevId) {
          await tx.$executeRawUnsafe(
            `UPDATE "ProjectDrawing" SET superseded_by = -1, "updatedAt" = NOW() WHERE id = $1`,
            prevId
          );
        }

        // Build create data strictly from provided fields and parsed drgNo
        const createData = {
          clientId: e.clientId,
          projectId: e.projectId,
          packageId: e.packageId,
          drgNo,
          revision:
            e.revision && String(e.revision).trim() !== ""
              ? String(e.revision).trim()
              : null,
          issueDate: e.issueDate ? new Date(String(e.issueDate)) : null,
          fileName: incomingPrimaryFile || null,
          meta: {
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

        const createdRow = await tx.projectDrawing.create({
          data: createData,
          select: { id: true },
        });
        const newId =
          createdRow && createdRow.id ? Number(createdRow.id) : null;
        if (newId) created++;
        if (newId && prevId) {
          await tx.$executeRawUnsafe(
            `UPDATE "ProjectDrawing" SET superseded_by = $1, "updatedAt" = NOW() WHERE id = $2`,
            newId,
            prevId
          );
          superseded++;
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
