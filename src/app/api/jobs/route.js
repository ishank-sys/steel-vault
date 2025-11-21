import { prisma } from '@/lib/prisma.js';
import { NextResponse } from 'next/server';

// Get all jobs with optional filtering
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.job.count({ where });

    return NextResponse.json({ 
      jobs: jobs.map(job => ({
        ...job,
        payload: job.payload ? JSON.stringify(job.payload).slice(0, 200) + '...' : null,
        result: job.result ? JSON.stringify(job.result).slice(0, 200) + '...' : null,
      })), 
      total,
      limit,
      offset 
    });
  } catch (e) {
    console.error('/api/jobs GET error', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}