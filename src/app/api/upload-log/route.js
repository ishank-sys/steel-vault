import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';

function serializeForJson(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = serializeForJson(value[k]);
    return out;
  }
  return value;
}

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

    return NextResponse.json(serializeForJson({ record }));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
