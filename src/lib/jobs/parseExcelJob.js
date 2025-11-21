import * as XLSX from 'xlsx';

export async function handleParseExcel(job, prisma) {
  const payload = job.payload || {};
  const b64 = payload.fileBase64;
  if (!b64) throw new Error('No fileBase64 in payload');
  const buf = Buffer.from(b64, 'base64');
  const arr = new Uint8Array(buf).buffer;
  const wb = XLSX.read(arr, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const headerIndex = data.findIndex((row) => row.some((cell) => typeof cell === 'string' && cell.toLowerCase().includes('dr no')));
  if (headerIndex === -1) {
    return { rows: [], warning: 'No header found' };
  }
  const header = data[headerIndex].map((cell) => typeof cell === 'string' ? cell.trim().toLowerCase() : '');
  const drgNoIndex = header.findIndex((col) => col.includes('dr no'));
  const itemIndex = header.findIndex((col) => col.includes('description'));
  const revIndex = header.findIndex((col) => col.includes('rev'));
  const statusIndex = header.findIndex((col) => col.includes('rev remarks'));
  const modelerIndex = header.findIndex((col) => col.includes('mod by'));
  const detailerIndex = header.findIndex((col) => col.includes('dr by'));
  const checkerIndex = header.findIndex((col) => col.includes('ch by'));
  const categoryIndex = header.findIndex((col) => col.includes('category'));
  const rows = data.slice(headerIndex + 1).filter((row) => row.length);
  const parsed = rows.map((row, i) => ({
    id: `job-${job.id}-${i}`,
    slno: i + 1,
    drgNo: (String(row[drgNoIndex] || '-') || '-').split('-')[0].trim() || '-',
    item: row[itemIndex] || '-',
    rev: row[revIndex] !== undefined && row[revIndex] !== null && row[revIndex] !== '' ? String(row[revIndex]) : '-',
    modeler: row[modelerIndex] || '-',
    detailer: row[detailerIndex] || '-',
    checker: row[checkerIndex] || '-',
    status: row[statusIndex] || '-',
    category: row[categoryIndex] || '',
    view: 'View',
    attachedPdfs: [],
    conflict: '--- No approval sent before',
    attachConflict: '',
  }));
  return { rows: parsed };
}

export default { handleParseExcel };
