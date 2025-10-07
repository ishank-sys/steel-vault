export async function uploadToGCSDirect(
  file: File,
  opts?: { clientId?: number; projectId?: number; packageId?: number | string; packageName?: string; onProgress?: (pct: number) => void }
) {
  const { clientId, projectId, packageId, packageName, onProgress } = opts || {};
  const debug = process.env.NEXT_PUBLIC_DEBUG_UPLOAD === '1';
  if (debug) console.log('[upload] start', { name: file.name, size: file.size, type: file.type, clientId, projectId });

  let signRes: Response;
  try {
    signRes = await fetch("/api/gcs/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      clientId,
      projectId,
      packageId,
      packageName,
    }),
    });
  } catch (e: any) {
    throw new Error(`[upload] sign request failed: ${e?.message || e}`);
  }
  if (!signRes.ok) throw new Error(`Failed to get signed URL: ${await signRes.text()}`);
  const { uploadUrl, objectPath, contentType } = await signRes.json();
  if (debug) console.log('[upload] signed', { objectPath, contentType, uploadUrl: uploadUrl?.slice(0, 120) + '...' });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    // Provide a 2 min timeout (adjustable via env)
    const timeoutMs = Number(process.env.NEXT_PUBLIC_UPLOAD_TIMEOUT_MS || 120000);
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (debug) console.log('[upload] put success', { status: xhr.status });
        resolve();
      } else {
        const msg = `[upload] put failed status=${xhr.status} response=${xhr.responseText?.slice(0,200)}`;
        if (debug) console.error(msg);
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => {
      const msg = '[upload] network error during upload (will attempt existence check)';
      if (debug) console.error(msg);
      // Attempt a best-effort existence check; helpful when CORS blocks response but object may have uploaded.
      const baseUrl = uploadUrl.split('?')[0];
      // Delay slightly to allow eventual write
      setTimeout(async () => {
        try {
          const headResp = await fetch(baseUrl, { method: 'HEAD' });
          if (debug) console.log('[upload] post-error head check', { status: headResp.status });
          if (headResp.ok) {
            if (debug) console.warn('[upload] treating CORS-blocked upload as success (object exists)');
            resolve();
            return;
          }
        } catch (e:any) {
          if (debug) console.warn('[upload] head check failed after error', e?.message || e);
        }
        reject(new Error('[upload] network error during upload'));
      }, 1200);
    };
    xhr.ontimeout = () => {
      const msg = '[upload] timeout during upload';
      if (debug) console.error(msg);
      reject(new Error(msg));
    };
    xhr.send(file);
  });

  // Optional verification: Issue HEAD request to confirm object exists if debug enabled
  if (debug) {
    try {
      const headUrl = uploadUrl.split('?')[0];
      const headResp = await fetch(headUrl, { method: 'HEAD' });
      if (debug) console.log('[upload] head verification', { status: headResp.status });
      if (!headResp.ok) {
        console.warn('[upload] head verification failed; object not yet visible');
      }
    } catch (e:any) {
      console.warn('[upload] head verification error', e?.message || e);
    }
  }

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

  if (debug) console.log('[upload] complete', { objectPath, size: file.size, record });

  return { objectPath, size: file.size, record };
}
