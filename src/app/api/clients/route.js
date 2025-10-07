import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";
import { getGCSStorage } from "@/lib/gcs";

export const runtime = 'nodejs';
const GCS_BUCKET = process.env.GCS_BUCKET;

export async function GET(req) {
  try {
    // Fetch all clients first
    const clients = await prisma.client.findMany();
    if (clients.length === 0) return NextResponse.json([]);

    const clientIds = clients.map(c => c.id);
    // Group project counts by client & status
    const grouped = await prisma.project.groupBy({
      by: ['clientId', 'status'],
      where: { clientId: { in: clientIds } },
      _count: { _all: true }
    });

    // Aggregate counts
    const ACTIVE_STATUSES = new Set(['Live', 'PLANNING', 'IN_PROGRESS']); // treat legacy 'Live' & new statuses as active
    const COMPLETED_STATUSES = new Set(['COMPLETED']);

    const statsMap = new Map();
    for (const row of grouped) {
      const key = row.clientId;
      const status = row.status || 'UNKNOWN';
      const count = row._count._all;
      const bucket = statsMap.get(key) || { total: 0, active: 0, completed: 0 };
      bucket.total += count;
      if (ACTIVE_STATUSES.has(status)) bucket.active += count;
      if (COMPLETED_STATUSES.has(status)) bucket.completed += count;
      statsMap.set(key, bucket);
    }

    // Merge into response (do NOT persist every request to avoid churn)
    const enriched = clients.map(c => {
      const s = statsMap.get(c.id) || { total: 0, active: 0, completed: 0 };
      return {
        ...c,
        // Expose live computed stats alongside stored values for transparency
        computedTotalProjects: s.total,
        computedActiveProjects: s.active,
        computedCompletedProjects: s.completed,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const client = await prisma.client.create({
      data: {
        name: body.name,
        email: body.email || "",
        companyName: body.companyName || "",
        contactNo: body.contactNo || "",
        address: body.address || "",
        configuration: body.configurationData || {},
        ccListData: body.ccListData || [],
        folderStructure: body.folderStructure || {},
      },
    });

    if (!GCS_BUCKET) {
      console.warn("GCS_BUCKET not set; skipping GCS folder creation.");
    } else {
      try {
        const storage = getGCSStorage();
        // build a safe prefix
        const safeName = (client.name || "client").replace(/[^\w\-]+/g, "-").toLowerCase();
        const folderName = `clients/${client.id}-${safeName}-${Date.now()}`;
        const placeholderPath = `${folderName}/.keep`;

        // ensure bucket exists and we can access it
        const bucket = storage.bucket(GCS_BUCKET);
        // attempt to write a small placeholder object
        const file = bucket.file(placeholderPath);
        await file.save("", { contentType: "application/x-empty" });

        // Do NOT rely on makePublic (may fail with Uniform bucket-level access).
        // Persist the canonical gs:// prefix in dbUrl. Use signed URLs for access.
        const gsPrefix = `gs://${GCS_BUCKET}/${folderName}/`;

        await prisma.client.update({
          where: { id: client.id },
          data: { dbUrl: gsPrefix },
        });

        const updated = await prisma.client.findUnique({ where: { id: client.id } });
        return NextResponse.json(updated);
      } catch (gcsErr) {
        console.error("GCS error while creating folder:", gcsErr);
        // return created client even if GCS failed (dbUrl will be empty)
        return NextResponse.json(client);
      }
    }

    return NextResponse.json(client);
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
