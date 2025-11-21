import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.js";
import { getGCSStorage } from "@/lib/gcs";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';



export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart/form-data for file uploads - enqueue job
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const projectId = formData.get("projectId") || "unknown";
      const fileType = formData.get("fileType") || "Extra"; // "Extra" or "3D Model"

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Get user email from headers
      const userEmail = req.headers.get("x-user-email");
      if (!userEmail) {
        return NextResponse.json({ error: "User email not provided" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ 
        where: { email: userEmail },
        include: { client: true }
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Handle both client users and admin users
      let client = user.client;
      let clientId = user.clientId;
      
      // If user is admin or doesn't have a client, use a default or get from project
      if (!client && user.userType === 'admin') {
        // For admin users, try to get client from project
        try {
          const project = await prisma.project.findUnique({ 
            where: { id: Number(projectId) },
            include: { client: true }
          });
          if (project && project.client) {
            client = project.client;
            clientId = project.client.id;
          } else {
            return NextResponse.json({ error: "Cannot determine client for admin user" }, { status: 400 });
          }
        } catch (e) {
          return NextResponse.json({ error: "Failed to resolve client from project" }, { status: 400 });
        }
      } else if (!client) {
        return NextResponse.json({ error: "User not associated with any company" }, { status: 403 });
      }

      // Convert file to base64 for job payload
      const arrayBuffer = await file.arrayBuffer();
      const fileBase64 = Buffer.from(arrayBuffer).toString('base64');

      // Create different subfolders for Extra and 3D Model files
      const subFolder = fileType === "3D Model" ? "3d-models" : "extras";

      // Enqueue upload job
      const job = await prisma.job.create({
        data: {
          type: "upload-file",
          payload: {
            fileBase64,
            fileName: file.name || `upload-${Date.now()}`,
            contentType: file.type || "application/octet-stream",
            clientId,
            projectId: Number(projectId),
            packageId: null,
            packageName: null,
            logType: "CLIENT_UPLOAD",
            subFolder,
            fileType,
          },
        },
      });

      return NextResponse.json({
        message: `${fileType} upload job enqueued`,
        jobId: job.id,
        status: "queued",
        fileName: file.name,
        fileType,
      });
    }

    return NextResponse.json({ error: "Invalid content type. Expected multipart/form-data" }, { status: 400 });
  } catch (err) {
    console.error("❌ API error in /api/upload-extra-3d POST:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}