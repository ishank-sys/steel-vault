import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { clientId, projectId, originalName, storagePath, size } = await req.json();

    const record = await prisma.documentLog.create({
      data: {
        fileName: originalName,
        clientId: clientId ? Number(clientId) : null,
        projectId: projectId ? Number(projectId) : null,
        storagePath: (storagePath || '').replace(/^gs:\/\/[^/]+\//, ''),
        size: size ?? null,
        logType: 'EMPLOYEE_UPLOAD',
      },
    });

    await prisma.upload.create({
      data: {
        clientId: clientId ? Number(clientId) : null,
        filename: originalName,
        storagePath,
        size: size ?? null,
      },
    });

    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
