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
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1)", Number(projectId));
    } catch (e) {
      // ignore lock acquisition errors here; let DB surface them if any
    }
    return await fn(tx);
  });
}

// Batch upsert drawings: entries is array of { clientId, projectId, packageId, drgNo, category, revision, fileNames, issueDate }
export async function batchUpsertDrawings(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return { created: 0, superseded: 0 };

  // Pre-process entries: resolve incomingPrimaryFile, drgNo, revision; validate required fields
  const processed = [];
  for (const e of entries) {
    try {
      const incomingPrimaryFile = (Array.isArray(e.fileNames) && e.fileNames[0]) || e.fileName || null;

      let drgNo = null;
      if (e.drgNo != null && String(e.drgNo).trim() !== "") {
        drgNo = normalizeDrgNo(e.drgNo);
      } else if (incomingPrimaryFile) {
        drgNo = normalizeDrgNo(incomingPrimaryFile);
      }

      // Determine provided revision; trim whitespace. If missing, try to extract from incomingPrimaryFile
      let providedRevision = e.revision && String(e.revision).trim() ? String(e.revision).trim() : null;
      // If no revision provided, attempt to infer from incomingPrimaryFile like '1053-RA.pdf' -> 'RA'
      if (!providedRevision && incomingPrimaryFile) {
        try {
          const fn = String(incomingPrimaryFile).trim();
          // Strip extension
          const base = fn.replace(/\.[^.]+$/, "");
          // Look for last hyphen or underscore separated token as possible revision
          const parts = base.split(/[-_]/).map((s) => s.trim()).filter(Boolean);
          if (parts.length > 1) {
            const candidate = parts[parts.length - 1];
            // Accept candidate if it contains only letters/numbers and is reasonably short
            if (/^[A-Za-z0-9]{1,8}$/.test(candidate)) {
              providedRevision = candidate;
            }
          }
        } catch (infErr) {
          // ignore inference errors
        }
      }

      const missing = [];
      if (e.clientId == null) missing.push("clientId");
      if (e.projectId == null) missing.push("projectId");
      if (drgNo == null || String(drgNo).trim() === "") missing.push("drgNo");
      if (!providedRevision) missing.push("revision");

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
                revision: providedRevision,
              },
            }
          );
        } catch (logErr) {}
        continue;
      }

      const categoryVal = e.category != null && String(e.category).trim() !== "" ? String(e.category).trim() : null;

      processed.push({
        original: e,
        clientId: e.clientId,
        projectId: e.projectId,
        packageId: e.packageId == null ? null : e.packageId,
        drgNo,
        revision: providedRevision,
        incomingPrimaryFile,
        category: categoryVal,
        fileNames: e.fileNames || (e.fileName ? [e.fileName] : []),
        issueDate: e.issueDate || null,
      });
    } catch (err) {
      console.warn("[projectDrawingsService] pre-processing entry failed", err?.message || err);
      // skip this entry and continue
    }
  }

  if (processed.length === 0) return { created: 0, superseded: 0 };

  // Deduplicate entries by composite key: projectId|clientId|packageId|null|drgNo|revision
  const deduped = [];
  const seen = new Set();
  for (const p of processed) {
    const pkgKey = p.packageId == null ? "NULL" : String(p.packageId);
    const key = `${p.projectId}|${p.clientId}|${pkgKey}|${p.drgNo}|${p.revision}`;
    if (seen.has(key)) {
      try {
        console.warn(
          "[projectDrawingsService] skipping duplicate entry within same batch ->",
          {
            key,
            entry: { clientId: p.clientId, projectId: p.projectId, packageId: p.packageId, drgNo: p.drgNo, revision: p.revision },
          }
        );
      } catch (logErr) {}
      continue;
    }
    seen.add(key);
    deduped.push(p);
  }

  if (deduped.length === 0) return { created: 0, superseded: 0 };

  // Determine projectId for the lock: use projectId from first deduped entry
  const projectIdFromFirst = deduped[0].projectId;
  if (projectIdFromFirst == null) throw new Error("projectId required");

  return await withProjectLock(projectIdFromFirst, async (tx) => {
    let created = 0;
    let superseded = 0;

    for (const e of deduped) {
      try {
        const drgNo = e.drgNo;
        const providedRevision = e.revision;
        const incomingPrimaryFile = e.incomingPrimaryFile;

        // Build WHERE clause to locate existing active drawing (same compound unique set)
        const whereParts = [];
        const params = [];
        let idx = 1;

        whereParts.push(`"projectId" = $${idx++}`);
        params.push(e.projectId);
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
              const rev = String(r.revision).toUpperCase().replace(/[^A-Z]/g, "");
              if (
                rev &&
                (maxRev == null || rev.length > maxRev.length || (rev.length === maxRev.length && rev > maxRev))
              ) {
                maxRev = rev;
              }
            }
          } catch (ignore) {}
        }

        const newRevision = providedRevision;

        // Verify project and client exist before attempting nested connects
        if (e.projectId != null) {
          try {
            const proj = await tx.project.findUnique({ where: { id: BigInt(String(e.projectId)) } });
            if (!proj) {
              console.warn('[projectDrawingsService] skipping entry - project not found', { projectId: e.projectId, drgNo });
              continue;
            }
          } catch (projErr) {
            console.warn('[projectDrawingsService] project lookup failed', projErr?.message || projErr);
            continue;
          }
        }
        if (e.clientId != null) {
          try {
            const client = await tx.client.findUnique({ where: { id: Number(e.clientId) } });
            if (!client) {
              console.warn('[projectDrawingsService] skipping entry - client not found', { clientId: e.clientId, drgNo });
              continue;
            }
          } catch (cliErr) {
            console.warn('[projectDrawingsService] client lookup failed', cliErr?.message || cliErr);
            continue;
          }
        }

        // Verify package exists when packageId provided
        if (e.packageId != null) {
          try {
            const pkg = await tx.projectPackage.findUnique({ where: { id: BigInt(String(e.packageId)) } });
            if (!pkg) {
              console.warn('[projectDrawingsService] skipping entry - package not found', { packageId: e.packageId, drgNo });
              continue;
            }
          } catch (pkgErr) {
            console.warn('[projectDrawingsService] package lookup failed', pkgErr?.message || pkgErr);
            continue;
          }
        }

        // Build create data strictly from provided fields and parsed drgNo
        const createData = {
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
        // Ensure nested project relation is connected — Prisma may require the relation
        // even when the foreign key scalar `projectId` is present.
        if (e.projectId != null) {
          try {
            createData.project = { connect: { id: BigInt(String(e.projectId)) } };
          } catch (convErr) {
            try {
              createData.project = { connect: { id: BigInt(Number(e.projectId)) } };
            } catch (err) {
              // let Prisma surface conversion errors
            }
          }
        }
        // Connect client via nested relation instead of passing scalar `clientId` directly.
        if (e.clientId != null) {
          createData.client = { connect: { id: Number(e.clientId) } };
        }
        // Connect package via nested relation when provided
        if (e.packageId != null) {
          try {
            createData.package = { connect: { id: BigInt(String(e.packageId)) } };
            // Also keep scalar for backwards-compatibility
            createData.packageId = BigInt(String(e.packageId));
          } catch (pkgErr) {
            try {
              createData.package = { connect: { id: BigInt(Number(e.packageId)) } };
              createData.packageId = BigInt(Number(e.packageId));
            } catch (convErr) {
              console.warn('[projectDrawingsService] failed to convert packageId', { packageId: e.packageId, err: convErr?.message || convErr });
            }
          }
        }
        if (e.category != null) createData.category = e.category;

        // Debug log of insertion target
        try {
          console.debug("[projectDrawingsService] inserting drawing ->", {
            clientId: e.clientId,
            projectId: e.projectId,
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
        const newId = createdRow && createdRow.id ? Number(createdRow.id) : null;
        if (newId) created++;

        // Mark all previous active rows as superseded and set status to VOID
        if (newId && prevRows.length) {
          const ids = prevRows.map((r) => Number(r.id)).filter(Boolean);
          if (ids.length) {
            // Use a parameterized UPDATE for all ids; last param is newId
            const idParams = ids.map((_, i) => `$${i + 1}`).join(",");
            await tx.$executeRawUnsafe(
              `UPDATE "ProjectDrawing" SET superseded_by = $${ids.length + 1}, status = 'VOID', "updatedAt" = NOW() WHERE id IN (${idParams})`,
              ...ids,
              newId
            );
            superseded += ids.length;
          }
        }
      } catch (err) {
        console.warn("[projectDrawingsService] entry upsert failed", err?.message || err);
        throw err;
      }
    }

    return { created, superseded, total: created };
  });
}

export async function handlePublishJob(job, prisma) {
  console.log("[projectDrawingsJob] handlePublishJob called for job:", job.payload.drawings);
  const payload = job.payload || {};
  const entries = Array.isArray(payload.drawings)
    ? payload.drawings.map((d) => ({
        clientId: payload.clientId || d.clientId,
        projectId: payload.projectId || d.projectId,
        packageId: d.packageId || d.package || null,
        // allow drgNo to be provided; batchUpsertDrawings will prefer this value
        drgNo: d.drgNo || d.drawingNo || d.drawing || null,
        category: d.category || d.cat || "",
        // Accept REV from Excel in various casings/column names
        revision:
          (d.revision && String(d.revision).trim()) ||
          (d.rev && String(d.rev).trim()) ||
          (d.REV && String(d.REV).trim()) ||
          (d.Rev && String(d.Rev).trim()) ||
          (d.rEv && String(d.rEv).trim()) ||
          null,
        fileNames: d.fileNames || (d.fileName ? [d.fileName] : []),
        issueDate: d.issueDate || null,
      }))
    : [];
  if (!entries.length) return { created: 0, superseded: 0 };
  return await batchUpsertDrawings(entries);
}
