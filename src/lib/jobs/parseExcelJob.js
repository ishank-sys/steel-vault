import * as XLSX from "xlsx";

export async function handleParseExcel(job, prisma) {
  const payload = job.payload || {};
  const b64 = payload.fileBase64;
  if (!b64) throw new Error("No fileBase64 in payload");
  const buf = Buffer.from(b64, "base64");
  const arr = new Uint8Array(buf).buffer;
  const wb = XLSX.read(arr, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headerIndex = data.findIndex((row) =>
    row.some(
      (cell) => typeof cell === "string" && cell.toLowerCase().includes("dr no")
    )
  );
  if (headerIndex === -1) {
    return { rows: [], warning: "No header found" };
  }
  const header = data[headerIndex].map((cell) =>
    typeof cell === "string" ? cell.trim().toLowerCase() : ""
  );
  const drgNoIndex = header.findIndex((col) => col.includes("dr no"));
  const itemIndex = header.findIndex((col) => col.includes("description"));
  // Robust revision column detection. Accepts 'rev', 'revision' in any case,
  // but purposely avoids columns that contain 'remark' (e.g. 'rev remarks').
  const revCandidates = ["rev", "revision"];
  let revIndex = -1;
  for (let i = 0; i < header.length; i++) {
    const col = header[i] || "";
    if (!col) continue;
    if (col.includes("remark")) continue; // skip remark columns
    for (const cand of revCandidates) {
      const re = new RegExp(`(^|[^a-zA-Z])${cand}([^a-zA-Z]|$)`);
      if (re.test(col)) {
        revIndex = i;
        break;
      }
    }
    if (revIndex !== -1) break;
  }
  if (revIndex === -1) {
    for (const cand of revCandidates) {
      const idx = header.findIndex((h) => h === cand);
      if (idx !== -1) {
        revIndex = idx;
        break;
      }
    }
  }
  // statusIndex looks for columns that contain 'remarks' (including 'rev remarks')
  const statusIndex = header.findIndex(
    (col) =>
      col.includes("remarks") ||
      col.includes("remark") ||
      col.includes("rev remarks")
  );
  const modelerIndex = header.findIndex((col) => col.includes("mod by"));
  const detailerIndex = header.findIndex((col) => col.includes("dr by"));
  const checkerIndex = header.findIndex((col) => col.includes("ch by"));
  const categoryIndex = header.findIndex((col) => col.includes("category"));
  const rows = data.slice(headerIndex + 1).filter((row) => row.length);
  const parsed = rows.map((row, i) => ({
    id: `job-${job.id}-${i}`,
    slno: i + 1,
    drgNo: (String(row[drgNoIndex] || "-") || "-").split("-")[0].trim() || "-",
    item: row[itemIndex] || "-",
    rev:
      row[revIndex] !== undefined &&
      row[revIndex] !== null &&
      row[revIndex] !== ""
        ? String(row[revIndex])
        : "-",
    modeler: row[modelerIndex] || "-",
    detailer: row[detailerIndex] || "-",
    checker: row[checkerIndex] || "-",
    status: row[statusIndex] || "-",
    category: row[categoryIndex] || "",
    view: "View",
    attachedPdfs: [],
    conflict: "--- No approval sent before",
    attachConflict: "",
  }));

  console.log(
    `[handleParseExcel] Parsed ${parsed.length} rows from Excel file for job ${job.id}: `,
    parsed.slice(0, 5)
  );
  return { rows: parsed };
}
