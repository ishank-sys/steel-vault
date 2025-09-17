export async function uploadToGCSDirect(
  file: File,
  opts?: { clientId?: number; projectId?: number; onProgress?: (pct: number) => void }
) {
  const { clientId, projectId, onProgress } = opts || {};

  const signRes = await fetch("/api/gcs/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      clientId,
      projectId,
    }),
  });
  if (!signRes.ok) throw new Error(`Failed to get signed URL: ${await signRes.text()}`);
  const { uploadUrl, objectPath, contentType } = await signRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  // Log metadata to our API (Prisma)
  const logRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      originalName: file.name,
      storagePath: objectPath,
      size: file.size,
      logType: "EMPLOYEE_UPLOAD",
    }),
  });
  if (!logRes.ok) {
    let msg = "";
    try { msg = await logRes.text(); } catch {}
    throw new Error(msg || `Logging failed with status ${logRes.status}`);
  }
  let record: any = null;
  try {
    const json = await logRes.json();
    record = json?.record ?? null;
  } catch {}

  return { objectPath, size: file.size, record };
}
