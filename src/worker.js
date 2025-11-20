#!/usr/bin/env node
import { prisma } from "@/lib/prisma.js";
import { handleParseExcel } from "@/lib/jobs/parseExcelJob.js";
import { handleValidateConflicts } from "@/lib/jobs/validateConflictsJob.js";
import { handlePublishJob } from "@/lib/jobs/projectDrawingsJob.js";
import { handleGenerateZip } from "@/lib/jobs/generateZipJob.js";

const POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000);

async function processOneJob() {
  // find one queued job
  const job = await prisma.job.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  console.log("[WORKER] picked job", job.id, job.type);
  try {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running", attempts: { increment: 1 } },
    });

    let result = null;
    if (job.type === "publish-job") {
      result = await handlePublishJob(job, prisma);
    } else if (job.type === "parse-excel") {
      result = await handleParseExcel(job, prisma);
    } else if (job.type === "validate-conflicts") {
      result = await handleValidateConflicts(job, prisma);
    } else if (job.type === "generate-zip") {
      result = await handleGenerateZip(job, prisma);
    } else {
      result = { message: "unknown job type" };
    }

    await prisma.job.update({
      where: { id: job.id },
      data: { status: "succeeded", result: result, progress: 100 },
    });
    console.log("[WORKER] job succeeded", job.id, job.type);
    return job.id;
  } catch (err) {
    console.error("[WORKER] job failed", job.id, err?.message || err);
    const attempts = (job.attempts || 0) + 1;
    const maxAttempts = job.maxAttempts || 5;
    const status = attempts >= maxAttempts ? "failed" : "queued";
    await prisma.job.update({
      where: { id: job.id },
      data: { status, error: err?.message || String(err), attempts },
    });
    return job.id;
  }
}

async function pollLoop() {
  while (true) {
    try {
      const res = await processOneJob();
      if (!res) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    } catch (e) {
      console.error("[WORKER] poll error", e?.message || e);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  console.log("[WORKER] starting worker poll loop...");
  pollLoop();
}

export default { pollLoop };
