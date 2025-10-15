import { prisma } from "@/lib/prisma.js";
import { NextResponse } from "next/server";

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
      `upm."id" AS "clientPM_id"`,
      `upm."name" AS "clientPM_name"`
    ];

  // Include clientJobNo from Client if column exists
  if (clientColSet.has('clientJobNo')) selectParts.push(`c."clientJobNo" AS "client_job_no"`);
    else selectParts.push(`NULL AS "client_job_no"`);
    // Include legacy Project.ClientprojectNo explicitly if available
    if (colSet.has('ClientprojectNo')) selectParts.push(`p."ClientprojectNo" AS "client_project_no"`);
    else selectParts.push(`NULL AS "client_project_no"`);

    let query = `
      SELECT ${selectParts.join(', ')}
  FROM "Project" p
  LEFT JOIN "Client" c ON c."id" = p."clientId"
  LEFT JOIN "User" u ON u."id" = p."solTLId"
  LEFT JOIN "User" upm ON upm."id" = p."clientPm"`;

    const params = [];
    if (clientId) {
      query += ` WHERE p."clientId" = $${params.length + 1}`;
      params.push(Number(clientId));
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

    return NextResponse.json(out);
  } catch (primaryErr) {
    console.warn('GET /api/projects raw fallback failed, retrying with Prisma include...', primaryErr?.message || primaryErr);
    try {
      // Fallback to Prisma (works when schema matches DB)
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId');
      const where = clientId ? { clientId: Number(clientId) } : {};
      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          solTL: { select: { id: true, name: true, userType: true } },
        },
      });
      return NextResponse.json(projects);
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

    const project = await prisma.project.create({
      data: {
        projectNo: generateProjectNo(),
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
      }
    });

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

    return NextResponse.json(project);
  } catch (err) {
    console.error("❌ Error creating project:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
