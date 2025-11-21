#!/usr/bin/env node
import { prisma } from "./lib/prisma.js";
import { handleParseExcel } from "./lib/jobs/parseExcelJob.js";
import { handleValidateConflicts } from "./lib/jobs/validateConflictsJob.js";
import { handlePublishJob } from "./lib/jobs/projectDrawingsJob.js";
import { handleGenerateZip } from "./lib/jobs/generateZipJob.js";

const POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 2000);

async function processOneJob() {
  // find one queued job and attempt to atomically claim it by setting status to 'running'
  const job = await prisma.job.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  // Try to atomically claim the job: only update if it's still queued
  const claimed = await prisma.job.updateMany({
    where: { id: job.id, status: "queued" },
    data: { status: "running", attempts: { increment: 1 } },
  });
  if (!claimed || claimed.count === 0) {
    // somebody else claimed or it was cancelled, skip
    return null;
  }

  // reload the job record after claim
  const claimedJob = await prisma.job.findUnique({ where: { id: job.id } });
  if (!claimedJob) return null;

  console.log("[WORKER] picked job", claimedJob.id, claimedJob.type);
  try {

    let result = null;
    if (claimedJob.type === "publish-job") {
      result = await handlePublishJob(claimedJob, prisma);
    } else if (claimedJob.type === "parse-excel") {
      result = await handleParseExcel(claimedJob, prisma);
    } else if (claimedJob.type === "validate-conflicts") {
      result = await handleValidateConflicts(claimedJob, prisma);
    } else if (claimedJob.type === "generate-zip") {
      result = await handleGenerateZip(claimedJob, prisma);
    } else {
      result = { message: "unknown job type" };
    }

    await prisma.job.update({
      where: { id: claimedJob.id },
      data: { status: "succeeded", result: result, progress: 100 },
    });
    console.log("[WORKER] job succeeded", claimedJob.id, claimedJob.type);
    return claimedJob.id;
  } catch (err) {
    console.error("[WORKER] job failed", claimedJob.id, err?.message || err);
    const attempts = (claimedJob.attempts || 0) + 1;
    const maxAttempts = claimedJob.maxAttempts || 5;
    const status = attempts >= maxAttempts ? "failed" : "queued";
    await prisma.job.update({
      where: { id: claimedJob.id },
      data: { status, error: err?.message || String(err), attempts },
    });
    return claimedJob.id;
  }
}

export async function pollLoop() {
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

