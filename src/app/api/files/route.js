import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const files = await prisma.documentLog.findMany({
      where: { clientId: Number(clientId) },
      orderBy: { uploadedAt: "desc" }, // Use the correct field name for ordering
    });

    return NextResponse.json(files);
  } catch (err) {
    console.error("Error fetching files:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
