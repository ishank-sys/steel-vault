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
    const where = clientId ? { clientId: Number(clientId) } : {};
    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        solTL: { select: { id: true, name: true, userType: true } },
      },
    });
    return new Response(JSON.stringify(projects), { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch projects" }), { status: 500 });
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
