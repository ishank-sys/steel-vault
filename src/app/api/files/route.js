import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma.js";

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const clientIdParam = url.searchParams.get("clientId"); // still supported optionally
    const projectIdParam = url.searchParams.get("projectId");

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Identify user
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, userType: true, clientId: true }
      });
    } catch (e) {
      console.warn('/api/files: user lookup failed', e?.message || e);
    }

    const isAdmin = String(user?.userType || session.user.userType || '').toLowerCase() === 'admin';
    const userClientId = user?.clientId ?? null;

    // Build where clause
    const where = {};
    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) where.projectId = pid;
    }

    if (isAdmin) {
      // admin sees all; optional clientId filter if provided
      if (clientIdParam) {
        const cid = Number(clientIdParam);
        if (Number.isFinite(cid)) where.clientId = cid;
      }
    } else {
      // non-admins: if client user, restrict to their clientId
      if (userClientId != null) {
        where.clientId = Number(userClientId);
      } else if (clientIdParam) {
        // fallback: if a clientId is provided and not a client user, allow filtering by it
        const cid = Number(clientIdParam);
        if (Number.isFinite(cid)) where.clientId = cid;
      } else {
        // no way to scope: deny
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const files = await prisma.documentLog.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(files);
  } catch (err) {
    console.error("Error fetching files:", err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
