import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";
import bcrypt from "bcryptjs";



// Handle POST /api/users (create user)
export async function POST(req) {
  try {
    const body = await req.json();
    const { userType, password, relievedDate, clientId } = body;

    if (!userType) {
      return NextResponse.json({ error: "userType is required (employee or client)" }, { status: 400 });
    }

    let hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // ✅ Pick only fields that actually exist in User schema
    const allowedFields = ["name", "email", "gender", "contactNo", "address"];
    const cleanData = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        cleanData[key] = body[key];
      }
    }

    const user = await prisma.user.create({
  data: {
    ...cleanData,
    userType,
    password: hashedPassword || undefined,
    relievedDate: relievedDate ? new Date(relievedDate) : null,
    clientId: userType === "client" ? Number(clientId) : null,
  },
});


    return NextResponse.json(user);
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// Handle GET /api/users (list users - optional filter)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userType = searchParams.get("userType");
  const clientId = searchParams.get("clientId");

  let users;
  const where = {};
  if (userType) where.userType = userType;
  if (clientId) where.clientId = Number(clientId);

  users = await prisma.user.findMany({ where, include: { client: true } });

  return NextResponse.json(users);
}
