import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGCSStorage } from "@/lib/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const GCS_BUCKET = process.env.GCS_BUCKET;
    if (!GCS_BUCKET) {
      return NextResponse.json({ error: "GCS_BUCKET not configured" }, { status: 500 });
    }

    const origin = (typeof (req as any).headers?.get === 'function' && (req as any).headers.get('origin')) || undefined;
    const { filename, contentType, clientId, projectId } = await req.json();
    if (!filename) return NextResponse.json({ error: "filename is required" }, { status: 400 });

    // Folder logic
    let clientFolder = "clients/unknown";
    const numericClientId = typeof clientId === "string" ? parseInt(clientId, 10) : Number(clientId);
    if (Number.isFinite(numericClientId) && numericClientId > 0) {
      try {
        const client = await prisma.client.findUnique({ where: { id: numericClientId } });
        if (client) {
          const base = client.name || client.companyName || `client-${client.id}`;
          clientFolder = `clients/${client.id}-${slugify(base)}`;
        } else {
          clientFolder = `clients/${numericClientId}`;
        }
      } catch {
        clientFolder = `clients/${numericClientId}`;
      }
    }

    let projectFolder = "";
    const numericProjectId = typeof projectId === "string" ? parseInt(projectId, 10) : Number(projectId);
    if (Number.isFinite(numericProjectId) && numericProjectId > 0) {
      try {
        const project = await prisma.project.findUnique({ where: { id: numericProjectId } });
        if (project) {
          const base = project.name || `project-${project.id}`;
          projectFolder = `${project.id}-${slugify(base)}`;
        } else {
          projectFolder = `${numericProjectId}`;
        }
      } catch {
        projectFolder = `${numericProjectId}`;
      }
    }

    const destName = `${Date.now()}_${filename}`;
    const destinationPath = `${clientFolder}/${projectFolder}/${destName}`
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");

    const storage = getGCSStorage();
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(destinationPath);

    const [sessionUrl] = await file.createResumableUpload({
      origin,
      contentType: contentType || "application/octet-stream",
    });

    return NextResponse.json({
      sessionUrl,
      objectPath: destinationPath,
      gsUri: `gs://${GCS_BUCKET}/${destinationPath}`,
      contentType: contentType || "application/octet-stream",
    });
  } catch (err: any) {
    console.error("/api/gcs/sign-resumable error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
