import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get('projectId'));
    if (!projectId) return NextResponse.json([]);

    // Introspect columns to handle varying casing/names
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ProjectPackage'`;
    const colSet = new Set((cols || []).map((r) => r.column_name || r.column_Name || r.COLUMN_NAME));

    const pick = (...names) => names.find((n) => n && colSet.has(n)) || null;
    const q = (c) => `"${c}"`;

    // Common column variants
    const idCol = pick('id') || 'id';
    const nameCol = pick('name');
    const pkgNumCol = pick('packageNumber', 'packagenumber');
    const tentativeCol = pick('tentativeDate', 'tentativedate');
    const issueCol = pick('issueDate', 'issuedate');
    const statusCol = pick('status');
    const projectIdCol = pick('projectId', 'projectid');
    const createdAtCol = pick('createdAt', 'createdat', 'id');

    if (!projectIdCol) {
      // Table exists but no projectId column detected; return empty gracefully
      return NextResponse.json([]);
    }

    // Build SELECT list dynamically with safe aliases
    const selectParts = [
      `${q(idCol)} AS "id"`,
      nameCol ? `${q(nameCol)} AS "_name"` : `NULL AS "_name"`,
      pkgNumCol ? `${q(pkgNumCol)} AS "_packagenumber"` : `NULL AS "_packagenumber"`,
      tentativeCol ? `${q(tentativeCol)} AS "_tentative"` : `NULL AS "_tentative"`,
      issueCol ? `${q(issueCol)} AS "_issue"` : `NULL AS "_issue"`,
      statusCol ? `${q(statusCol)} AS "_status"` : `NULL AS "_status"`,
    ];

    const sql = `
      SELECT ${selectParts.join(', ')}
      FROM "public"."ProjectPackage"
      WHERE ${q(projectIdCol)} = $1
      ORDER BY ${q(createdAtCol)} DESC`;

    const rows = await prisma.$queryRawUnsafe(sql, projectId);

    const data = (rows || []).map((r) => ({
      id: Number(r.id),
      name: r._name || r._packagenumber || (r.id != null ? `Package-${r.id}` : 'Package'),
      packageNumber: r._packagenumber || null,
      tentativeDate: r._tentative || null,
      issueDate: r._issue || null,
      status: r._status || null,
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/packages error:', e?.message || e);
    return NextResponse.json([]); // fail soft to avoid breaking UI
  }
}
