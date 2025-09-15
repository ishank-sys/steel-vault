// app/api/roles/[id]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Update role
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();

  const updatedRole = await prisma.role.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      parentRole: body.parentRole,
      selectedUsers: body.selectedUsers,
      menuPermissions: body.menuPermissions,
      customPermissions: body.customPermissions,
      projectWise: body.projectWise,
    },
  });

  return NextResponse.json(updatedRole);
}

// ✅ Delete role
export async function DELETE(req, { params }) {
  const { id } = params;
  await prisma.role.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: "Role deleted successfully" });
}
