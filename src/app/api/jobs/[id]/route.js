import { prisma } from '@/lib/prisma.js';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const id = Number(params.id);
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    console.error('/api/jobs/[id] GET error', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  // POST used for retry by setting status back to queued
  try {
    const id = Number(params.id);
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
    await prisma.job.update({ where: { id }, data: { status: 'queued', error: null } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('/api/jobs/[id] POST error', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
