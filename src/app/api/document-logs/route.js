import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma.js';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope');
    const tlIdParam = url.searchParams.get('tlId');
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Load minimal user info to determine access scope
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, userType: true, clientId: true },
    });

    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    const isAdmin = String(user.userType || '').toLowerCase() === 'admin';

    let where = {};
    if (scope === 'tl') {
      // Team-lead scoped: show only logs for projects where this user is solTL
      if (isAdmin) {
        // Admin can optionally scope by tlId
        const tlId = tlIdParam ? Number(tlIdParam) : null;
        if (Number.isFinite(tlId)) {
          where = { project: { solTLId: tlId } };
        } else {
          where = {};
        }
      } else {
        where = { project: { solTLId: user.id } };
      }
    } else {
      // Default behavior: admin sees all; non-admin by clientId
      where = isAdmin ? {} : { clientId: user.clientId ?? undefined };
    }

    const documentLogs = await prisma.documentLog.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(documentLogs);
  } catch (err) {
    console.error('Failed to fetch document logs:', err);
    return NextResponse.json({ error: 'Failed to fetch document logs' }, { status: 500 });
  }
}
