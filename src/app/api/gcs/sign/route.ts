import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGCSStorage } from "@/lib/gcs";

export const runtime = "nodejs"; // important for prisma/@google-cloud/storage
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

  const { filename, contentType, clientId, projectId, packageId, packageName } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    // Derive client folder
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

    // Derive project folder
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

    // Optional package folder (resolve from DB if only id is given)
    let packageFolder = '';
    if (packageId || packageName) {
      let pkgLabel = packageName ? slugify(String(packageName)) : '';
      if (!pkgLabel && packageId) {
        try {
          const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT name, packagenumber, projectid FROM "public"."ProjectPackage" WHERE id = $1 LIMIT 1`,
            Number(packageId)
          );
          if (rows && rows.length) {
            const row = rows[0];
            // Optional: ensure package belongs to projectId if provided
            if (!projectId || Number(row.projectid) === Number(projectId)) {
              const base = row.packagenumber || row.name || `package-${packageId}`;
              pkgLabel = slugify(String(base));
            }
          }
        } catch (e) {
          // fallback below
        }
      }
      if (!pkgLabel && packageId) pkgLabel = `package-${packageId}`;
      if (pkgLabel) packageFolder = `packages/${pkgLabel}`;
    }

    const destName = `${Date.now()}_${filename}`;
    // Collapse any double slashes and trim trailing slash
    const destinationPath = `${clientFolder}/${projectFolder}/${packageFolder}/${destName}`
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");

    const storage = getGCSStorage();
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(destinationPath);

    const ct = contentType || "application/octet-stream";
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      contentType: ct,
    });

    return NextResponse.json({
      uploadUrl,
      objectPath: destinationPath,
      gsUri: `gs://${GCS_BUCKET}/${destinationPath}`,
      contentType: ct,
    });
  } catch (err: any) {
    console.error("/api/gcs/sign error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
