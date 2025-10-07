import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get('projectId'));
    if (!projectId) return NextResponse.json([]);

    // Use raw query to fetch from existing ProjectPackage table if Prisma model is missing
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, packagenumber, tentativedate, issuedate, status
       FROM "public"."ProjectPackage"
       WHERE projectid = $1
       ORDER BY createdat DESC`,
      projectId
    );

    // Normalize the response shape
    const data = (rows || []).map(r => ({
      id: Number(r.id),
      name: r.name || r.packagenumber || `Package-${r.id}`,
      packageNumber: r.packagenumber || null,
      tentativeDate: r.tentativedate || null,
      issueDate: r.issuedate || null,
      status: r.status || null,
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/packages error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 });
  }
}
