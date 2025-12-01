import { prisma } from "../prisma.js";

export function normalizeDrgNo(raw) {
  if (raw === undefined || raw === null) return raw;
  const s = String(raw).trim();
  if (!s) return s;
  const parts = s.split("-");
  const base = parts[0].trim();
  return base || s;
}

class ProjectDrawingService {
  constructor(prismaClient = prisma) {
    this.prisma = prismaClient;
    this.logger = console;
  }

  /**
   * Execute function within a transaction with project-level advisory lock
   * @param {number} projectId - Project ID for locking
   * @param {function} fn - Function to execute within transaction
   * @returns {Promise<any>} Transaction result
   */
  async withProjectLock(projectId, fn) {
    return await this.prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRawUnsafe(
          "SELECT pg_advisory_xact_lock($1)",
          Number(projectId)
        );
      } catch (e) {
        // Ignore lock acquisition errors; let DB surface them if needed
      }
      return await fn(tx);
    });
  }

  /**
   * Safely convert value to BigInt, handling edge cases
   * @param {any} value - Value to convert
   * @returns {BigInt|null} Converted BigInt or null
   */
  safeToBigInt(value) {
    if (value == null || value === BigInt || typeof value === "function") {
      return null;
    }
    try {
      return BigInt(String(value));
    } catch {
      try {
        return BigInt(Number(value));
      } catch {
        return null;
      }
    }
  }

  /**
   * Extract primary file from fileNames array or fileName property
   * @param {object} entry - Entry with fileNames or fileName
   * @returns {string|null} Primary file name
   */
  extractPrimaryFile(entry) {
    return (
      (Array.isArray(entry.fileNames) && entry.fileNames[0]) ||
      entry.fileName ||
      null
    );
  }

  /**
   * Extract revision from filename if not provided explicitly
   * @param {string} filename - Filename to extract revision from
   * @returns {string|null} Extracted revision or null
   */
  extractRevisionFromFilename(filename) {
    if (!filename) return null;

    try {
      const fn = String(filename).trim();
      const base = fn.replace(/\.[^.]+$/, "");
      const parts = base
        .split(/[-_]/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length > 1) {
        const candidate = parts[parts.length - 1];
        if (/^[A-Za-z0-9]{1,8}$/.test(candidate)) {
          return candidate;
        }
      }
    } catch {
      // Ignore extraction errors
    }

    return null;
  }

  /**
   * Normalize and validate package ID
   * @param {any} packageId - Package ID to validate
   * @returns {BigInt|null} Validated package ID
   */
  normalizePackageId(packageId) {
    if (packageId == null) return null;

    if (packageId === BigInt || typeof packageId === "function") {
      this.logger.warn(
        "[ProjectDrawingService] packageId is BigInt constructor or function, setting to null"
      );
      return null;
    }

    if (typeof packageId === "object" && packageId.constructor === Object) {
      this.logger.warn(
        "[ProjectDrawingService] packageId is plain object, setting to null:",
        packageId
      );
      return null;
    }

    return this.safeToBigInt(packageId);
  }

  /**
   * Extract revision from multiple possible field names
   * @param {object} data - Data object with potential revision fields
   * @returns {string|null} Extracted revision
   */
  extractRevision(data) {
    const revisionFields = ["revision", "rev", "REV", "Rev", "rEv"];

    for (const field of revisionFields) {
      if (data[field] && String(data[field]).trim()) {
        return String(data[field]).trim();
      }
    }

    return null;
  }

  /**
   * Validate required fields for drawing entry
   * @param {object} entry - Drawing entry to validate
   * @returns {string[]} Array of missing field names
   */
  validateRequiredFields(entry) {
    const missing = [];
    const { clientId, projectId, drgNo, revision } = entry;

    if (clientId == null) missing.push("clientId");
    if (projectId == null) missing.push("projectId");
    if (drgNo == null || String(drgNo).trim() === "") missing.push("drgNo");
    if (!revision) missing.push("revision");

    return missing;
  }

  /**
   * Process and normalize a single drawing entry
   * @param {object} entry - Raw drawing entry
   * @returns {object|null} Processed entry or null if invalid
   */
  processEntry(entry) {
    try {
      const incomingPrimaryFile = this.extractPrimaryFile(entry);

      // Resolve drawing number
      let drgNo = null;
      if (entry.drgNo != null && String(entry.drgNo).trim() !== "") {
        drgNo = normalizeDrgNo(entry.drgNo);
      } else if (incomingPrimaryFile) {
        drgNo = normalizeDrgNo(incomingPrimaryFile);
      }

      // Resolve revision - strictly use provided revision, don't infer from filename
      let providedRevision =
        entry.revision && String(entry.revision).trim()
          ? String(entry.revision).trim()
          : null;

      // Only extract from filename if NO revision was provided at all from Excel
      if (!providedRevision && incomingPrimaryFile && !entry.revision) {
        providedRevision =
          this.extractRevisionFromFilename(incomingPrimaryFile);
      }

      // Validate required fields
      const processedEntry = {
        original: entry,
        clientId: entry.clientId,
        projectId: entry.projectId,
        packageId: this.normalizePackageId(entry.packageId),
        drgNo,
        revision: providedRevision,
        incomingPrimaryFile,
        // Strictly respect category from Excel - don't infer or normalize
        category:
          entry.category != null && String(entry.category).trim() !== ""
            ? String(entry.category).trim()
            : null,
        fileNames: entry.fileNames || (entry.fileName ? [entry.fileName] : []),
        issueDate: entry.issueDate || null,
      };

      const missing = this.validateRequiredFields(processedEntry);
      if (missing.length) {
        this.logger.warn(
          "[ProjectDrawingService] skipping entry missing required fields",
          {
            missing,
            entry: {
              clientId: processedEntry.clientId,
              projectId: processedEntry.projectId,
              packageId: processedEntry.packageId,
              drgNo: processedEntry.drgNo,
              revision: processedEntry.revision,
            },
          }
        );
        return null;
      }

      return processedEntry;
    } catch (err) {
      this.logger.warn(
        "[ProjectDrawingService] pre-processing entry failed",
        err?.message || err
      );
      return null;
    }
  }

  /**
   * Deduplicate processed entries by composite key
   * @param {object[]} processed - Processed entries
   * @returns {object[]} Deduplicated entries
   */
  deduplicateEntries(processed) {
    const deduped = [];
    const seen = new Set();

    for (const entry of processed) {
      const pkgKey = entry.packageId == null ? "NULL" : String(entry.packageId);
      const key = `${entry.projectId}|${entry.clientId}|${pkgKey}|${entry.drgNo}|${entry.revision}`;

      if (seen.has(key)) {
        this.logger.warn("[ProjectDrawingService] skipping duplicate entry within batch", {
          key,
          entry: {
            clientId: entry.clientId,
            projectId: entry.projectId,
            packageId: entry.packageId,
            drgNo: entry.drgNo,
            revision: entry.revision,
            category: entry.category,
          },
        });
        continue;
      }

      // If we have an entry with the same drgNo and revision but missing category,
      // prefer the one with category (from Excel) over the one without
      const existingIndex = deduped.findIndex(existing => 
        existing.projectId === entry.projectId &&
        existing.clientId === entry.clientId &&
        existing.drgNo === entry.drgNo &&
        existing.revision === entry.revision &&
        ((existing.packageId == null && entry.packageId == null) || existing.packageId === entry.packageId)
      );

      if (existingIndex >= 0) {
        const existing = deduped[existingIndex];
        // Prefer entry with category over entry without category
        if (!existing.category && entry.category) {
          this.logger.info("[ProjectDrawingService] replacing entry without category with categorized entry", {
            drgNo: entry.drgNo,
            revision: entry.revision,
            oldCategory: existing.category,
            newCategory: entry.category,
          });
          deduped[existingIndex] = entry;
        } else {
          this.logger.warn("[ProjectDrawingService] skipping duplicate drgNo+revision", {
            drgNo: entry.drgNo,
            revision: entry.revision,
            existingCategory: existing.category,
            incomingCategory: entry.category,
          });
        }
        continue;
      }

      seen.add(key);
      deduped.push(entry);
    }

    return deduped;
  }

  /**
   * Verify that referenced entities exist
   * @param {object} tx - Transaction instance
   * @param {object} entry - Drawing entry to verify
   * @returns {Promise<boolean>} True if all entities exist
   */
  async verifyEntities(tx, entry) {
    // Verify project exists
    if (entry.projectId != null) {
      try {
        const project = await tx.project.findUnique({
          where: { id: this.safeToBigInt(entry.projectId) },
        });
        if (!project) {
          this.logger.warn("[ProjectDrawingService] project not found", {
            projectId: entry.projectId,
            drgNo: entry.drgNo,
          });
          return false;
        }
      } catch (err) {
        this.logger.warn(
          "[ProjectDrawingService] project lookup failed",
          err?.message || err
        );
        return false;
      }
    }

    // Verify client exists
    if (entry.clientId != null) {
      try {
        const client = await tx.client.findUnique({
          where: { id: Number(entry.clientId) },
        });
        if (!client) {
          this.logger.warn("[ProjectDrawingService] client not found", {
            clientId: entry.clientId,
            drgNo: entry.drgNo,
          });
          return false;
        }
      } catch (err) {
        this.logger.warn(
          "[ProjectDrawingService] client lookup failed",
          err?.message || err
        );
        return false;
      }
    }

    // Verify package exists (if specified)
    if (entry.packageId != null) {
      try {
        const pkg = await tx.projectPackage.findUnique({
          where: { id: entry.packageId },
        });
        if (!pkg) {
          this.logger.warn("[ProjectDrawingService] package not found", {
            packageId: String(entry.packageId),
            drgNo: entry.drgNo,
          });
          return false;
        }
      } catch (err) {
        this.logger.warn(
          "[ProjectDrawingService] package lookup failed",
          err?.message || err
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Build WHERE clause for finding existing drawings
   * @param {object} entry - Drawing entry
   * @returns {object} Object with whereSql and params
   */
  buildWhereClause(entry) {
    const whereParts = [];
    const params = [];
    let idx = 1;

    whereParts.push(`"projectId" = $${idx++}`);
    params.push(entry.projectId);

    if (entry.packageId == null) {
      whereParts.push(`"packageId" IS NULL`);
    } else {
      whereParts.push(`"packageId" = $${idx++}`);
      params.push(entry.packageId);
    }

    whereParts.push(`"clientId" = $${idx++}`);
    params.push(entry.clientId);
    whereParts.push(`"drgNo" = $${idx++}`);
    params.push(entry.drgNo);
    whereParts.push(`superseded_by IS NULL`);

    return {
      whereSql: whereParts.join(" AND "),
      params,
    };
  }

  /**
   * Calculate previous revision from current revision
   * @param {string} currentRevision - Current revision (e.g., 'B', 'C', etc.)
   * @returns {string|null} Previous revision or null if it's the first revision
   */
  calculatePrevRevision(currentRevision) {
    if (!currentRevision) return null;
    
    const rev = String(currentRevision).trim().toUpperCase();
    if (!rev || rev === 'A') {
      // First revision has no previous revision
      return null;
    }
    
    // For single letter revisions (A, B, C, etc.)
    if (rev.length === 1 && /[A-Z]/.test(rev)) {
      const charCode = rev.charCodeAt(0);
      if (charCode > 65) { // Greater than 'A'
        return String.fromCharCode(charCode - 1);
      }
    }
    
    // For multi-character revisions, try to decrement intelligently
    // This is a simplified approach - extend as needed for your revision scheme
    if (rev.length > 1) {
      const lastChar = rev[rev.length - 1];
      const prefix = rev.slice(0, -1);
      
      if (/[A-Z]/.test(lastChar)) {
        const charCode = lastChar.charCodeAt(0);
        if (charCode > 65) {
          return prefix + String.fromCharCode(charCode - 1);
        } else if (prefix.length > 0) {
          // Handle cases like 'BA' -> 'AZ' (if needed)
          return prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) - 1) + 'Z';
        }
      }
    }
    
    return null;
  }

  /**
   * Find maximum revision from existing drawings (kept for compatibility)
   * @param {object[]} existingRows - Existing drawing rows
   * @returns {string|null} Maximum revision
   */
  findMaxRevision(existingRows) {
    let maxRev = null;

    for (const row of existingRows) {
      try {
        if (row?.revision) {
          const rev = String(row.revision)
            .toUpperCase()
            .replace(/[^A-Z]/g, "");
          if (
            rev &&
            (maxRev == null ||
              rev.length > maxRev.length ||
              (rev.length === maxRev.length && rev > maxRev))
          ) {
            maxRev = rev;
          }
        }
      } catch {
        // Ignore revision parsing errors
      }
    }

    return maxRev;
  }

  /**
   * Build create data for new drawing
   * @param {object} entry - Processed entry
   * @param {string|null} maxRev - Maximum existing revision
   * @returns {object} Create data object
   */
  buildCreateData(entry, maxRev) {
    // Calculate prevRev based on current revision, not existing drawings
    const prevRev = this.calculatePrevRevision(entry.revision);
    
    const createData = {
      drgNo: entry.drgNo,
      revision: entry.revision,
      prevRev: prevRev,
      issueDate: entry.issueDate ? new Date(String(entry.issueDate)) : null,
      fileName: entry.incomingPrimaryFile || null,
      status: "IN_PROGRESS",
      meta: {
        revision: entry.revision,
        fileNames: entry.fileNames || [],
        issueDate: entry.issueDate || null,
      },
      metadata: {
        revision: entry.revision,
        fileNames: entry.fileNames || [],
        issueDate: entry.issueDate || null,
      },
      lastAttachedAt: new Date(),
    };

    // Add project relation
    if (entry.projectId != null) {
      createData.project = {
        connect: { id: this.safeToBigInt(entry.projectId) },
      };
    }

    // Add client relation
    if (entry.clientId != null) {
      createData.client = { connect: { id: Number(entry.clientId) } };
    }

    // Add package relation
    if (entry.packageId != null) {
      createData.packageId = entry.packageId;
    }

    // Add category
    if (entry.category != null) {
      createData.category = entry.category;
    }

    return createData;
  }

  /**
   * Supersede previous drawing versions
   * @param {object} tx - Transaction instance
   * @param {object[]} prevRows - Previous drawing rows
   * @param {number} newId - New drawing ID
   * @returns {Promise<number>} Number of superseded rows
   */
  async supersedePreviousVersions(tx, prevRows, newId) {
    if (!prevRows.length) return 0;

    const ids = prevRows.map((r) => Number(r.id)).filter(Boolean);
    if (!ids.length) return 0;

    const idParams = ids.map((_, i) => `$${i + 1}`).join(",");
    await tx.$executeRawUnsafe(
      `UPDATE "ProjectDrawing" SET superseded_by = $${
        ids.length + 1
      }, status = 'VOID', "updatedAt" = NOW() WHERE id IN (${idParams})`,
      ...ids,
      newId
    );

    return ids.length;
  }

  /**
   * Process a single drawing entry within transaction
   * @param {object} tx - Transaction instance
   * @param {object} entry - Processed drawing entry
   * @returns {Promise<object>} Result with created and superseded counts
   */
  async processDrawingEntry(tx, entry) {
    // Verify entities exist
    if (!(await this.verifyEntities(tx, entry))) {
      return { created: 0, superseded: 0 };
    }

    // Build WHERE clause and fetch existing drawings
    const { whereSql, params } = this.buildWhereClause(entry);
    const existingRows = await tx.$queryRawUnsafe(
      `SELECT id, revision FROM "ProjectDrawing" WHERE ${whereSql} FOR UPDATE`,
      ...params
    );
    const prevRows = Array.isArray(existingRows) ? existingRows : [];

    // Find maximum existing revision
    const maxRev = this.findMaxRevision(prevRows);

    // Build create data
    const createData = this.buildCreateData(entry, maxRev);

    // Log insertion target
    this.logger.debug("[ProjectDrawingService] inserting drawing", {
      clientId: entry.clientId,
      projectId: entry.projectId,
      packageId:
        createData.packageId != null ? String(createData.packageId) : null,
      drgNo: createData.drgNo,
      category: createData.category ?? null,
      revision: createData.revision,
      fileName: createData.fileName,
    });

    // Create new drawing
    const createdRow = await tx.projectDrawing.create({
      data: createData,
      select: { id: true },
    });

    const newId = createdRow?.id ? Number(createdRow.id) : null;
    if (!newId) return { created: 0, superseded: 0 };

    // Supersede previous versions
    const superseded = await this.supersedePreviousVersions(
      tx,
      prevRows,
      newId
    );

    return { created: 1, superseded };
  }

  /**
   * Batch upsert drawings with transaction and locking
   * @param {object[]} entries - Array of drawing entries
   * @returns {Promise<object>} Result with created, superseded, and total counts
   */
  async batchUpsertDrawings(entries = []) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { created: 0, superseded: 0, total: 0 };
    }

    console.log(`[ProjectDrawingService] Processing ${entries.length} entries for batch upsert`);

    // Process and validate entries
    const processed = entries
      .map((entry) => this.processEntry(entry))
      .filter(Boolean);

    if (processed.length === 0) {
      console.log(`[ProjectDrawingService] No valid entries after processing`);
      return { created: 0, superseded: 0, total: 0 };
    }

    console.log(`[ProjectDrawingService] ${processed.length} entries validated and processed`);

    // Deduplicate entries
    const deduped = this.deduplicateEntries(processed);
    if (deduped.length === 0) {
      console.log(`[ProjectDrawingService] No entries remain after deduplication`);
      return { created: 0, superseded: 0, total: 0 };
    }

    console.log(`[ProjectDrawingService] ${deduped.length} entries remain after deduplication`);

    // Get project ID for locking
    const projectId = deduped[0].projectId;
    if (projectId == null) {
      throw new Error("projectId required");
    }

    // Execute within transaction with project lock
    return await this.withProjectLock(projectId, async (tx) => {
      let totalCreated = 0;
      let totalSuperseded = 0;

      for (const entry of deduped) {
        try {
          const result = await this.processDrawingEntry(tx, entry);
          totalCreated += result.created;
          totalSuperseded += result.superseded;
        } catch (err) {
          this.logger.warn(
            "[ProjectDrawingService] entry upsert failed",
            err?.message || err
          );
          throw err;
        }
      }

      return {
        created: totalCreated,
        superseded: totalSuperseded,
        total: totalCreated,
      };
    });
  }
}

export const projectDrawingService = new ProjectDrawingService();

export async function batchUpsertDrawings(entries = []) {
  return await projectDrawingService.batchUpsertDrawings(entries);
}

/**
 * Handle publish job - external helper function optimized for large batches
 * @param {object} job - Job payload
 * @param {object} prisma - Prisma client (optional, for compatibility)
 * @returns {Promise<object>} Processing result
 */
export async function handlePublishJob(job, prisma) {
  const startTime = Date.now();
  const payload = job.payload || {};
  
  console.log(`[projectDrawingsJob] Starting handlePublishJob for ${payload.drawings?.length || 0} drawings`);
  
  const drawingService = new ProjectDrawingService(prisma);

  if (!Array.isArray(payload.drawings)) {
    console.warn("[projectDrawingsJob] No drawings array found in payload");
    return { created: 0, superseded: 0 };
  }

  const entries = payload.drawings.map((d) => {
    const entry = {
      clientId: payload.clientId || d.clientId,
      projectId: payload.projectId || d.projectId,
      packageId: payload.packageId || d.packageId || d.package || null,
      drgNo: d.drgNo || d.drawingNo || d.drawing || null,
      // Strictly respect category from Excel data - don't infer or override
      category: d.category || d.cat || null,
      // Strictly respect revision from Excel data - don't extract from filename
      revision: d.revision || d.rev || d.REV || d.Rev || null,
      fileNames: d.fileNames || (d.fileName ? [d.fileName] : []),
      issueDate: d.issueDate || null,
    };
    
    // Debug logging for category flow
    console.log(`[projectDrawingsJob] Processing drawing ${entry.drgNo}: original d.category = ${JSON.stringify(d.category)}, final category = ${JSON.stringify(entry.category)}`);
    
    return entry;
  });

  if (!entries.length) {
    console.warn("[projectDrawingsJob] No valid entries to process");
    return { created: 0, superseded: 0 };
  }

  try {
    const result = await drawingService.batchUpsertDrawings(entries);
    const duration = Date.now() - startTime;
    
    console.log(`[projectDrawingsJob] Completed handlePublishJob in ${duration}ms:`, {
      processed: entries.length,
      created: result.created,
      superseded: result.superseded,
      clientId: payload.clientId,
      projectId: payload.projectId,
      packageId: payload.packageId,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[projectDrawingsJob] Failed handlePublishJob after ${duration}ms:`, error?.message || error);
    throw error;
  }
}
