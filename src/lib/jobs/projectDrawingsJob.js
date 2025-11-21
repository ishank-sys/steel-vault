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
  if (!Array.isArray(entries) || entries.length === 0)
    return { created: 0, superseded: 0 };
  const projectId = entries[0].projectId;
  if (!projectId) throw new Error("projectId required");

  return await withProjectLock(projectId, async (tx) => {
    let created = 0;
    let superseded = 0;
    for (const e of entries) {
      // minimal upsert: try to mark existing active row as superseded then insert new row
      try {
        const whereParts = [];
        const params = [];
        let idx = 1;
        // Ensure we have a usable drawing number. Prefer explicit fields, then
        // fall back to the first filename, then generate a unique token so we
        // never attempt to insert a NULL into the non-nullable `drgNo` column.
        const candidateRaw =
          e.drgNo ??
          e.drawingNo ??
          e.drawing ??
          (Array.isArray(e.fileNames) && e.fileNames[0]) ??
          e.fileName ??
          "";
        let drgNo = normalizeDrgNo(candidateRaw);
        if (drgNo === undefined || drgNo === null || drgNo === "") {
          const basename = String(candidateRaw || "")
            .replace(/\.[^/.]+$/, "")
            .trim();
          if (basename) drgNo = normalizeDrgNo(basename) || basename;
          else
            drgNo = `__no-drg__${Date.now()}_${Math.floor(
              Math.random() * 1000
            )}`;
        }
        // Log resolved values to help diagnose why drgNo may be empty/null
        try {
          console.debug("[projectDrawingsService] drgNo candidate/raw ->", {
            candidateRaw,
            resolvedDrgNo: drgNo,
            fileNames: e.fileNames,
            fileName: e.fileName,
          });
        } catch (logErr) {
          // ignore logging errors
        }

        // Ensure required fields exist for this entry. If any are missing,
        // skip this entry and continue with the next one to avoid aborting
        // the transaction due to a bad payload row.
        const missing = [];
        if (e.clientId == null) missing.push("clientId");
        if (e.projectId == null) missing.push("projectId");
        if (e.packageId == null) missing.push("packageId");
        if (drgNo === undefined || drgNo === null || drgNo === "")
          missing.push("drgNo");
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
                  candidateRaw,
                  resolvedDrgNo: drgNo,
                },
              }
            );
          } catch (logErr) {
            // ignore logging errors
          }
          continue;
        }

        whereParts.push(`"projectId" = $${idx++}`);
        params.push(e.projectId);
        // packageId is required now, always include it in the matching WHERE
        whereParts.push(`"packageId" = $${idx++}`);
        params.push(e.packageId);
        // include clientId and category so the SELECT matches the same
        // compound-unique combination used by Prisma upsert
        whereParts.push(`"clientId" = $${idx++}`);
        params.push(e.clientId);
        const categoryVal = e.category || "";
        whereParts.push(`"category" = $${idx++}`);
        params.push(categoryVal);
        // use normalized drawing number for matching and insertion
        whereParts.push(`"drgNo" = $${idx++}`);
        params.push(drgNo);
        whereParts.push(`superseded_by IS NULL`);
        const whereSql = whereParts.join(" AND ");

        const existing = await tx.$queryRawUnsafe(
          `SELECT id FROM "ProjectDrawing" WHERE ${whereSql} FOR UPDATE`,
          ...params
        );
        const prevId =
          Array.isArray(existing) && existing[0]
            ? Number(existing[0].id)
            : null;
        if (prevId) {
          await tx.$executeRawUnsafe(
            `UPDATE "ProjectDrawing" SET superseded_by = -1, "updatedAt" = NOW() WHERE id = $1`,
            prevId
          );
        }

        const cols = [];
        const vals = [];
        const params2 = [];
        // push value with optional cast (e.g., 'jsonb', 'timestamptz', 'date')
        const push = (v, cast) => {
          params2.push(v);
          vals.push(
            cast ? `$${params2.length}::${cast}` : `$${params2.length}`
          );
        };
        cols.push('"clientId"');
        push(e.clientId);
        cols.push('"projectId"');
        push(e.projectId);
        // packageId is required, always include in the INSERT
        cols.push('"packageId"');
        push(e.packageId);
        cols.push('"drgNo"');
        push(drgNo);
        cols.push("category");
        push(e.category || "");
        cols.push("revision");
        push(e.revision && e.revision.trim() !== "" ? e.revision.trim() : null);
        cols.push('"fileName"');
        push((Array.isArray(e.fileNames) && e.fileNames[0]) || null);
        cols.push("meta");
        push(
          JSON.stringify({
            fileNames: e.fileNames || [],
            issueDate: e.issueDate || null,
          }),
          "jsonb"
        );
        cols.push('"lastAttachedAt"');
        push(new Date().toISOString(), "timestamptz");

        // Log the final values we will insert to help debugging drgNo issues
        try {
          console.debug("[projectDrawingsService] inserting drawing ->", {
            clientId: e.clientId,
            projectId: e.projectId,
            packageId: e.packageId,
            drgNo,
            category: e.category || "",
            revision: e.revision || null,
            fileName:
              (Array.isArray(e.fileNames) && e.fileNames[0]) ||
              e.fileName ||
              null,
            meta: {
              fileNames: e.fileNames || [],
              issueDate: e.issueDate || null,
            },
          });
        } catch (logErr) {
          // ignore logging errors
        }

        // Use Prisma create instead of raw SQL to avoid column mismatch/null
        // mapping issues and to let Prisma handle types properly.
        // Use upsert to update existing active drawing instead of attempting
        // to insert a duplicate which would violate the unique constraint.
        // Prisma compound-unique field name derived from the @@unique order:
        // projectId_packageId_clientId_drgNo_category
        const where = {
          projectId_packageId_clientId_drgNo_category: {
            projectId: e.projectId,
            packageId: e.packageId,
            clientId: e.clientId,
            drgNo,
            category: categoryVal,
          },
        };

        const upsertData = {
          where,
          update: {
            revision: e.revision || null,
            fileName:
              (Array.isArray(e.fileNames) && e.fileNames[0]) ||
              e.fileName ||
              null,
            meta: {
              fileNames: e.fileNames || [],
              issueDate: e.issueDate || null,
            },
            lastAttachedAt: new Date(),
          },
          create: {
            clientId: e.clientId,
            projectId: e.projectId,
            packageId: e.packageId,
            drgNo,
            category: categoryVal,
            revision: e.revision || null,
            fileName:
              (Array.isArray(e.fileNames) && e.fileNames[0]) ||
              e.fileName ||
              null,
            meta: {
              fileNames: e.fileNames || [],
              issueDate: e.issueDate || null,
            },
            lastAttachedAt: new Date(),
          },
          select: { id: true },
        };

        const createdRow = await tx.projectDrawing.upsert(upsertData);
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
        // Rethrow to abort the transaction early — if we continue after a SQL
        // error the transaction will be in an aborted state (25P02) and every
        // subsequent DB call will fail. Let the caller handle retries.
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
        drgNo: d.drgNo || d.drawingNo || d.drawing || d.drgNo || d.drgNo,
        category: d.category || d.cat || "",
        revision: d.revision || d.rev || null,
        fileNames: d.fileNames || [],
        issueDate: d.issueDate || null,
      }))
    : [];
  if (!entries.length) return { created: 0, superseded: 0 };
  return await batchUpsertDrawings(entries);
}
