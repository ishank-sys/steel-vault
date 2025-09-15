// app/api/roles/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ GET all roles
export async function GET() {
  const roles = await prisma.role.findMany();
  return NextResponse.json(roles);
}

// ✅ POST create role
export async function POST(req) {
  try {
    const body = await req.json();
    const role = await prisma.role.create({
      data: {
        name: body.name,
        parentRole: body.parentRole || null,
        selectedUsers: body.selectedUsers || [],
        menuPermissions: body.menuPermissions || [],
        customPermissions: body.customPermissions || [],
        projectWise: body.projectWise ?? false,
      },
    });
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
