import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

export async function GET() {
  try {
    // Fetch all document logs from the database
    const documentLogs = await prisma.documentLog.findMany();

    // Return the logs as JSON
    return NextResponse.json(documentLogs);
  } catch (err) {
    console.error('Failed to fetch document logs:', err);
    return NextResponse.json({ error: 'Failed to fetch document logs' }, { status: 500 });
  }
}
