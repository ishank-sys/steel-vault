import { prisma } from "@/lib/prisma.js";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Safely serialize BigInt values for JSON responses
function serializeForJson(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = serializeForJson(value[k]);
    return out;
  }
  return value;
}

function generateProjectNo() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EST${year}${rand}`;
}

// GET all projects
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const scope = searchParams.get('scope');
    const tlIdParam = searchParams.get('tlId');
    let session = null;
    try {
      // Session only needed when scoping to TL
      if (scope === 'tl') {
        session = await getServerSession(authOptions);
      }
    } catch {}

  // First, introspect available Project columns so we don't reference non-existent ones.
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Project'`;
  const colSet = new Set((cols || []).map((r) => r.column_name || r.column_Name || r.COLUMN_NAME));
  // Also introspect Client columns for optional fields (e.g., clientJobNo)
  const clientCols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Client'`;
  const clientColSet = new Set((clientCols || []).map((r) => r.column_name || r.column_Name || r.COLUMN_NAME));

    // Prefer these columns in order for a displayable project number
    const projectNoCandidates = [
      'projectNo',         // new schema
      'ClientprojectNo',   // legacy schema
      'solProjectNo'       // internal SOL number
    ];
    const chosenProjectNoCol = projectNoCandidates.find((c) => colSet.has(c)) || null;

    // Choose order column
    const orderCol = colSet.has('createdAt') ? 'createdAt' : 'id';

    // Build SELECT list dynamically to avoid touching missing columns
    const selectParts = [
      `p."id" AS "id"`,
      chosenProjectNoCol ? `p."${chosenProjectNoCol}" AS "_projectNoRaw"` : `NULL AS "_projectNoRaw"`,
      colSet.has('name') ? `p."name" AS "name"` : `NULL AS "name"`,
      colSet.has('description') ? `p."description" AS "description"` : `NULL AS "description"`,
      colSet.has('clientId') ? `p."clientId" AS "clientId"` : `NULL AS "clientId"`,
      colSet.has('status') ? `p."status" AS "status"` : `NULL AS "status"`,
      colSet.has('priority') ? `p."priority" AS "priority"` : `NULL AS "priority"`,
      colSet.has('progress') ? `p."progress" AS "progress"` : `NULL AS "progress"`,
      colSet.has('createdAt') ? `p."createdAt" AS "createdAt"` : `NULL AS "createdAt"`,
      colSet.has('solTLId') ? `p."solTLId" AS "solTLId"` : `NULL AS "solTLId"`,
      colSet.has('clientPm') ? `p."clientPm" AS "clientPm"` : `NULL AS "clientPm"`,
      // flatten joined fields and re-nest in JS
      `c."id" AS "client_id"`,
      `c."name" AS "client_name"`,
      `u."id" AS "solTL_id"`,
      `u."name" AS "solTL_name"`,
      `u."userType" AS "solTL_userType"`,
    ];
    // Only include client PM flattened fields if the column exists (and join will be added)
    if (colSet.has('clientPm')) {
      selectParts.push(`upm."id" AS "clientPM_id"`);
      selectParts.push(`upm."name" AS "clientPM_name"`);
    } else {
      selectParts.push(`NULL AS "clientPM_id"`);
      selectParts.push(`NULL AS "clientPM_name"`);
    }

  // Include clientJobNo from Client if column exists
  if (clientColSet.has('clientJobNo')) selectParts.push(`c."clientJobNo" AS "client_job_no"`);
    else selectParts.push(`NULL AS "client_job_no"`);
    // Include legacy Project.ClientprojectNo explicitly if available
    if (colSet.has('ClientprojectNo')) selectParts.push(`p."ClientprojectNo" AS "client_project_no"`);
    else selectParts.push(`NULL AS "client_project_no"`);

    // Only join client PM user if the Project table actually contains the clientPm column
    let query = `
      SELECT ${selectParts.join(', ')}
  FROM "Project" p
  LEFT JOIN "Client" c ON c."id" = p."clientId"
  LEFT JOIN "User" u ON u."id" = p."solTLId"`;
    if (colSet.has('clientPm')) {
      query += `\n  LEFT JOIN "User" upm ON upm."id" = p."clientPm"`;
    }

    const params = [];
    const whereClauses = [];
    if (clientId) {
      whereClauses.push(`p."clientId" = $${params.length + 1}`);
      params.push(Number(clientId));
    }
    if (scope === 'tl') {
      // Admin can optionally pass tlId to scope; non-admin forced to their own id
      const isAdmin = String(session?.user?.userType || '').toLowerCase() === 'admin';
      const tlIdNum = tlIdParam ? Number(tlIdParam) : Number(session?.user?.id);
      if (!Number.isNaN(tlIdNum) && Number.isFinite(tlIdNum)) {
        // Only apply where if non-admin OR admin explicitly provided tlId
        if (!isAdmin || (isAdmin && tlIdParam)) {
          // Prefer direct column if present
          if (colSet.has('solTLId')) {
            whereClauses.push(`p."solTLId" = $${params.length + 1}`);
          } else {
            // Fallback to joined user id (join already present)
            whereClauses.push(`u."id" = $${params.length + 1}`);
          }
          params.push(tlIdNum);
        }
      }
    }
    if (whereClauses.length) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }
    query += ` ORDER BY p."${orderCol}" DESC`;

    // Run the raw query safely with parameter binding
    const rows = await prisma.$queryRawUnsafe(query, ...params);
    const out = (rows || []).map((r) => ({
      id: r.id,
      projectNo: r._projectNoRaw ?? null,
      name: r.name ?? '',
      description: r.description ?? null,
      clientId: r.clientId ?? r.client_id ?? null,
      status: r.status ?? null,
      priority: r.priority ?? null,
      progress: r.progress ?? null,
      createdAt: r.createdAt ?? null,
      solTLId: r.solTLId ?? r.solTL_id ?? null,
      clientPm: r.clientPm ?? r.clientPM_id ?? null,
      // Expose legacy client project/job number directly
      ClientprojectNo: r.client_project_no ?? null,
      clientProjectNo: r.client_project_no ?? null,
      client: {
        id: r.client_id ?? null,
        name: r.client_name ?? null,
        clientJobNo: r.client_job_no ?? null,
      },
      solTL: r.solTL_id ? {
        id: r.solTL_id,
        name: r.solTL_name ?? null,
        userType: r.solTL_userType ?? null,
      } : null,
      clientPM: r.clientPM_id ? {
        id: r.clientPM_id,
        name: r.clientPM_name ?? null,
      } : null,
    }));

    return NextResponse.json(serializeForJson(out));
  } catch (primaryErr) {
    console.warn('GET /api/projects raw fallback failed, retrying with Prisma include...', primaryErr?.message || primaryErr);
    try {
      // Fallback to Prisma (works when schema matches DB)
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId');
      const scope = searchParams.get('scope');
      const tlIdParam = searchParams.get('tlId');
      let session = null;
      try { if (scope === 'tl') session = await getServerSession(authOptions); } catch {}
      const where = clientId ? { clientId: Number(clientId) } : {};
      if (scope === 'tl') {
        const isAdmin = String(session?.user?.userType || '').toLowerCase() === 'admin';
        const tlIdNum = tlIdParam ? Number(tlIdParam) : Number(session?.user?.id);
        if (!Number.isNaN(tlIdNum) && Number.isFinite(tlIdNum)) {
          if (!isAdmin || (isAdmin && tlIdParam)) {
            where.solTLId = tlIdNum;
          }
        }
      }
      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          solTL: { select: { id: true, name: true, userType: true } },
        },
      });
      return NextResponse.json(serializeForJson(projects));
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
  }
}

// POST new project
export async function POST(req) {
  try {
    const body = await req.json();
    // Basic required field checks
    if (!body.projectName) {
      return NextResponse.json({ error: 'projectName is required' }, { status: 400 });
    }
    if (!body.clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Introspect Project columns to avoid inserting into non-existent columns
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Project'`;
    const colSet = new Set((cols || []).map((r) => r.column_name || r.column_Name || r.COLUMN_NAME));

    const data = {
      name: body.projectName,
      description: body.description || null,
      clientId: Number(body.clientId),
      solTLId: body.solTLId ? Number(body.solTLId) : null,
      estimationDate: body.estimationDate ? new Date(body.estimationDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : null,
      totalProjectHours: body.totalProjectHours || null,
      actualProjectHours: body.actualProjectHours || null,
      totalSheetQty: body.totalSheetQty || null,
      totalDays: body.totalDays ? Number(body.totalDays) : null,
      projectType: body.projectType || null,
      projectSubType: body.projectSubType || null,
      weightTonnage: body.weightTonnage || null,
      projectComplexity: body.projectComplexity || null,
      solJobNo: body.solJobNo || null,
      jobName: body.jobName || null,
      branch: body.branch || null,
      priority: body.priority || undefined, // let default apply if not provided
      status: body.status || undefined,     // let default apply if not provided
      progress: body.progress !== undefined ? body.progress : undefined, // default 0.0
      projectDataFolder: body.projectDataFolder || null,
      estimationRows: Array.isArray(body.estimationRows) ? body.estimationRows : [],
    };
    if (colSet.has('projectNo')) {
      data.projectNo = generateProjectNo();
    }

    const project = await prisma.project.create({ data });

    // Increment denormalized client stats (best-effort; ignore errors silently)
    const ACTIVE_STATUSES = new Set(['Live', 'PLANNING', 'IN_PROGRESS']);
    const COMPLETED_STATUSES = new Set(['COMPLETED']);
    const updates = { totalProjects: { increment: 1 } };
    if (ACTIVE_STATUSES.has(project.status)) {
      updates.activeProjects = { increment: 1 };
    }
    if (COMPLETED_STATUSES.has(project.status)) {
      updates.completedProjects = { increment: 1 };
    }
    try {
      await prisma.client.update({ where: { id: project.clientId }, data: updates });
    } catch (e) {
      console.warn('Could not update client project counters:', e.message);
    }

    return NextResponse.json(serializeForJson(project));
  } catch (err) {
    console.error("❌ Error creating project:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
