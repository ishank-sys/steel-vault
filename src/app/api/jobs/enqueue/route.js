import { prisma } from '@/lib/prisma.js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body || !body.type) return NextResponse.json({ error: 'type required' }, { status: 400 });
    const job = await prisma.job.create({ data: { type: body.type, payload: body.payload || {} } });
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    console.error('/api/jobs/enqueue POST error', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
