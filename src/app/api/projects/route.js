import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

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

    const project = await prisma.project.create({
      data: {
        projectNo: generateProjectNo(),
        name: body.projectName,
        description: body.description || null,
        clientId: Number(body.clientId),
        estimatedBy: body.estimatedBy,
        estimationDate: body.estimationDate ? new Date(body.estimationDate) : null,
        totalProjectHours: body.totalProjectHours || null,
        totalSheetQty: body.totalSheetQty || null,
        fabricatorJobNo: body.fabricatorJobNo || null,
        projectType: body.projectType || null,
        projectSubType: body.projectSubType || null,
        projectInitials: body.projectInitials || null,
        weightTonnage: body.weightTonnage || null,
        estimationRows: body.estimationRows || [],
      },
    });

    return NextResponse.json(project);
  } catch (err) {
    console.error("❌ Error creating project:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
