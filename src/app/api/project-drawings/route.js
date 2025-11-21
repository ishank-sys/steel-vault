import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeForJson(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      out[k] = serializeForJson(value[k]);
    }
    return out;
  }
  return value;
}

async function getColumnsMap(table = "ProjectDrawing") {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`
  );
  const list = Array.isArray(rows)
    ? rows.map((r) => String(r.column_name || r.COLUMN_NAME || ""))
    : [];
  const lower = new Map(list.map((n) => [n.toLowerCase(), n]));
  return { list, lower };
}

async function getTargetTable() {
  return "ProjectDrawing";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = Number(searchParams.get("projectId"));
    const packageId =
      searchParams.get("packageId") != null
        ? Number(searchParams.get("packageId"))
        : null;
    const hasFinitePackage = packageId != null && Number.isFinite(packageId);
    const all = searchParams.get("all"); // when truthy, include history (superseded rows)
    const drawingFilter = searchParams.get("drawing");
    if (!Number.isFinite(projectId)) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }
    const table = await getTargetTable();
    // await ensureTable(table);
    const { lower } = await getColumnsMap(table);
    const drawingActual = lower.get("drawingnumber") || lower.get("drgno");
    const drawingQuoted = drawingActual ? `"${drawingActual}"` : '"drgNo"';
    const projectActual = lower.get("projectid") || lower.get("project_id");
    const packageActual = lower.get("packageid") || lower.get("package_id");
    const hasSupersede = lower.has("superseded_by");
    const whereParts = [];
    const args = [];
    let idx = 1;
    if (projectActual) {
      whereParts.push(`"${projectActual}" = $${idx++}`);
      args.push(projectId);
    }
    if (hasFinitePackage && packageActual) {
      whereParts.push(`"${packageActual}" = $${idx++}`);
      args.push(packageId);
    }
    // Default to only ACTIVE (non-superseded) rows unless ?all=1
    if (hasSupersede && !(all === "1" || all === "true" || all === "yes")) {
      whereParts.push(`superseded_by IS NULL`);
    }
    // Optional drawing equality filter on either drgNo or drgNo
    if (drawingFilter) {
      const drawingActual = lower.get("drawingnumber") || lower.get("drgno");
      if (drawingActual) {
        whereParts.push(`"${drawingActual}" = $${idx++}`);
        args.push(drawingFilter);
      }
    }
    const whereSql = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";
    let rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" ${whereSql} ORDER BY ${drawingQuoted} ASC`,
      ...args
    );
    // Fallback: if filtering by packageId yields no rows (legacy data may have NULL packageId), try project-only
    if (
      Array.isArray(rows) &&
      rows.length === 0 &&
      hasFinitePackage &&
      packageActual
    ) {
      try {
        const whereParts2 = [];
        const args2 = [];
        let idx2 = 1;
        if (projectActual) {
          whereParts2.push(`"${projectActual}" = $${idx2++}`);
          args2.push(projectId);
        }
        const whereSql2 = whereParts2.length
          ? `WHERE ${whereParts2.join(" AND ")}`
          : "";
        rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${table}" ${whereSql2} ORDER BY ${drawingQuoted} ASC`,
          ...args2
        );
      } catch {}
    }
    return NextResponse.json(serializeForJson(rows || []));
  } catch (e) {
    console.error("/api/project-drawings GET error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const clientId = Number(body?.clientId);
    const projectId = Number(body?.projectId);
    const packageId = body?.packageId != null ? Number(body.packageId) : null;
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!Number.isFinite(clientId) || !Number.isFinite(projectId)) {
      return NextResponse.json(
        { error: "clientId and projectId are required and numeric" },
        { status: 400 }
      );
    }
    if (!entries.length) {
      return NextResponse.json(
        { error: "entries array is required" },
        { status: 400 }
      );
    }

    // Normalize incoming entries to the canonical shape expected by the worker job.
    const today = new Date().toISOString().slice(0, 10);
    const normalized = entries
      .map((e) => {
        const drgNo = String(
          e?.drgNo ?? e?.drawingNo ?? e?.drawing ?? ""
        ).trim();
        if (!drgNo) return null;
        const fileNames = Array.isArray(e?.fileNames)
          ? e.fileNames.map((s) => String(s))
          : e?.fileName
          ? [String(e.fileName)]
          : [];
        return {
          clientId: Number(e?.clientId) || undefined,
          projectId: Number(e?.projectId) || undefined,
          packageId:
            e?.packageId != null ? Number(e.packageId) : packageId || undefined,
          drgNo,
          category: e?.category ?? e?.cat ?? "",
          revision: e?.revision ?? e?.rev ?? null,
          fileNames,
          issueDate: e?.issueDate ? String(e.issueDate) : today,
        };
      })
      .filter(Boolean);

    if (!normalized.length) {
      return NextResponse.json(
        { error: "No valid entries to enqueue" },
        { status: 400 }
      );
    }

    // Create a publish-job in the jobs table; the worker will process it and run batchUpsertDrawings.
    const job = await prisma.job.create({
      data: {
        type: "publish-job",
        payload: {
          clientId,
          projectId,
          drawings: normalized,
        },
      },
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (e) {
    console.error("/api/project-drawings POST error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
