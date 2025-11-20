'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from "jszip";
import { saveAs } from 'file-saver';
import { uploadToGCSDirect } from '@/lib/uploadToGCS';
import useDrawingStore from '../../../../src/stores/useDrawingStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';


const TransmittalForm = () => {
  // Zustand store
  const { selectedDrawings, approvedDrawings, drawings: storeDrawings, approvedExtras, approvedModels, projectName, projectNo, selectedClientId, selectedProjectId, selectedPackageId, selectedPackageName, transmittalName, submittalName, zipName, generateLogName, clearLogName, setZipName } = useDrawingStore();

    const router = useRouter();
  
  // Modal state for viewing attachments
  const [showModal, setShowModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [modalDrawingNo, setModalDrawingNo] = useState('');
  // Publish confirmation / print
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(null); // null | 'processing' | 'uploading'
  const [completeLogEnabled, setCompleteLogEnabled] = useState(false);
  // Email fields
  const [toEmails, setToEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Date logic from HybridPublishDrawings
  const today = new Date().toISOString().slice(0, 10);

  // --- Filename helpers (DDMMYY_ProjectName_Suffix) ---
  const getDateStr = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  };
  const sanitizeProjectForFile = (name) => String(name || '')
    // remove characters illegal on Windows/macOS file names but keep spaces
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  const makeLogBase = (suffix) => {
    const dateStr = getDateStr();
    const proj = sanitizeProjectForFile(projectName || projectNo || 'Project');
    return `${dateStr}_${proj}_${suffix}`;
  };

  // --- Auto-fill Header Info from selected project ---
  useEffect(() => {
    let cancelled = false;

    const setIfEmpty = (ref, val) => {
      if (!ref?.current) return;
      // don't override if user already typed
      if (ref.current.value && String(ref.current.value).trim().length > 0) return;
      if (val == null) return;
      try { ref.current.value = String(val); } catch {}
    };

    const resolveAndFill = async () => {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;

        // Try to match by id, projectNo, name
        const match = list.find(p => {
          const idMatch = projectNo && !isNaN(Number(projectNo)) && Number(p.id) === Number(projectNo);
          const noMatch = projectNo && (String(p.projectNo) === String(projectNo));
          const nameMatch = projectName && (String(p.name) === String(projectName) || String(p.projectName) === String(projectName));
          return idMatch || noMatch || nameMatch;
        });
        if (!match || cancelled) return;

        // Map common fields safely. These keys are guessed based on typical schema and earlier API includes.
  // 1) FABRICATOR JOB NO. -> Prefer Project.ClientprojectNo, then Client.clientJobNo
  const clientProjNo = match?.ClientprojectNo || match?.clientProjectNo || match?.client_project_no || match?.clientProjNo || match?.client_proj_no || match?.client?.clientJobNo || match?.fabricatorJobNo || match?.jobNo || match?.projectJobNo || '';
        setIfEmpty(jobNoRef, clientProjNo);
        // 2) FABRICATOR CO-ORDINATOR -> prefer Project.clientPM.name
        const pmName = match?.clientPM?.name || match?.clientPm?.name || match.coordinator || match.fabricatorCoordinator || match.client?.coordinator || match.client?.contactPerson || '';
  setIfEmpty(coordinatorRef, pmName);
        // 3) SOL JOB NO
        setIfEmpty(solJobNoRef, match.solJobNo || match.solJob || match.projectNo || '');
        // 4) FABRICATOR NAME -> Prefer Client.name; fallback to embedded project.client
        setIfEmpty(fabricatorNameRef, match.client?.name || match.fabricatorName || match.clientName || '');
        // 5) SOL Team Leader
        setIfEmpty(teamLeaderRef, match.solTL?.name || match.teamLeader || match.teamLead || '');
        // Last 4 fields (Transmittal Name, Submittal Name, Zip Name, Complete Name) are intentionally left manual.
      } catch (e) {
        console.warn('Failed to prefill project header fields', e?.message || e);
      }
    };

    resolveAndFill();

    return () => { cancelled = true; };
  }, [projectNo, projectName]);

  // When client changes, fetch Client table to fill Fabricator Name = Client.name and Job No = Client.clientJobNo (if present)
  useEffect(() => {
    let cancelled = false;
    const loadClientName = async () => {
      if (selectedClientId == null) return;
      try {
        const res = await fetch('/api/clients', { cache: 'no-store' });
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        const cid = Number(selectedClientId);
        const match = list.find(c => Number(c.id) === cid);
        if (cancelled) return;
        // Always set if empty to avoid overwriting manual edits
        if (match?.name && fabricatorNameRef?.current && (!fabricatorNameRef.current.value || fabricatorNameRef.current.value.trim().length === 0)) {
          try { fabricatorNameRef.current.value = String(match.name); } catch {}
        }
        if (match?.clientJobNo && jobNoRef?.current && (!jobNoRef.current.value || jobNoRef.current.value.trim().length === 0)) {
          try { jobNoRef.current.value = String(match.clientJobNo); } catch {}
        }
      } catch {}
    };
    loadClientName();
    return () => { cancelled = true; };
  }, [selectedClientId]);

  // Map approvedDrawings to the table format you need, with date logic
const tableDrawings = selectedDrawings.map((d, i) => {
    const rev = d.rev || '';
    const isNumericRev = /^\d+$/.test(rev);
    const isAlphaRev = /^[a-zA-Z]+$/.test(rev);

    return {
      id: i + 1,
      desc: d.itemName || d.item || '-',
      drawingNo: d.drawingNo || d.drgNo || '-',
      rev: rev,
      dateSentForApproval: isAlphaRev ? today : (d.approvalDate || d.dateSentForApproval || ''),
      dateReceivedBFA: d.bfaDate || '',
      dateSentForFab: isNumericRev ? today : (d.fabDate || d.dateSentForFab || ''),
      remark: d.remark || (d.void ? 'For Approval [VOID]' : 'For Approval'),
      void: d.void || false,
      detailer: d.detailer || 'AHE',
      checker: d.checker || 'SOH',
      sheetSize: d.sheetSize || (i === 3 || i === 4 ? '18x24' : '11x17'),
      itemQty: i === 0 || i === 2 ? '2' : i === 1 ? '1' : '1', // Default to 1
      attachedPdfs: d.attachedPdfs || [],
      category: d.category || '', // For ZIP folder
    };
  });

  // Refs for header info
  const jobNoRef = useRef();
  const coordinatorRef = useRef();
  const solJobNoRef = useRef();
  const fabricatorNameRef = useRef();
  const teamLeaderRef = useRef();
  const zipNameRef = useRef();
  const completeNameRef = useRef();

  // Download handler
  // const handleDownload = async () => {
  //   // --- Get header info values from refs ---
  //   const fabricatorJobNo = jobNoRef.current?.value || '';
  //   const fabricatorCoordinator = coordinatorRef.current?.value || '';
  //   const solJobNo = solJobNoRef.current?.value || '';
  //   const fabricatorName = fabricatorNameRef.current?.value || '';
  //   const solTeamLeader = teamLeaderRef.current?.value || '';
  //   const zipName = zipNameRef.current?.value || '';

  //   // --- Calculate COUNT of drawings for "WE ARE SENDING YOU" section ---
  //   let newItemForApprovalQty = 0;
  //   let newItemForFabFieldQty = 0;
  //   let deletedItemQty = 0;
  //   let revisedItemForApprovalQty = 0; // Placeholder for future logic
  //   let revisedItemForFabFieldQty = 0; // Placeholder for future logic

  //   tableDrawings.forEach(d => {
  //     const hasDateSentForApproval = d.dateSentForApproval && d.dateSentForApproval.trim() !== '';
  //     const hasDateSentForFab = d.dateSentForFab && d.dateSentForFab.trim() !== '';

  //     if (d.void) {
  //       deletedItemQty++;
  //     } else if (hasDateSentForApproval) {
  //       newItemForApprovalQty++;
  //     } else if (hasDateSentForFab) {
  //       newItemForFabFieldQty++;
  //     }
  //   });

  //   const totalQty = tableDrawings.length;

  //   // --- PDF EXPORT ---
  //   const doc = new jsPDF('p', 'pt', 'a4');
  //   let y = 40;

  //   // --- Letterhead ---
  //   doc.setFontSize(14);
  //   doc.text('STRUCTURES ONLINE', 40, y);
  //   doc.setFontSize(10);
  //   doc.text('C 56A/27, Sec-62, Noida-201307', 40, y + 15);
  //   doc.text('Tel:+911202403056, www.structuresonline.net', 40, y + 30);
  //   doc.text('E:mail: mahesh_teli@sol-mail.net', 40, y + 45);

  //   // --- Title ---
  //   doc.setFontSize(16);
  //   doc.text('LETTER OF TRANSMITTAL', 350, y + 10);

  //   // --- Header Info Block from Form Inputs ---
  //   y += 80;
  //   const todayDate = new Date();
  //   const formattedDate = `${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}-${todayDate.getFullYear()}`;

  //   doc.setFontSize(10);
  //   doc.setFont('helvetica', 'normal');

  //   // Left column of header

  //   addToZipByExtension(extras);
  //   addToZipByExtension(models);

  //   // Add the PDF to the root of the ZIP
  //   zip.file(`${zipName || 'Transmittal'}.pdf`, pdfBlob);

  //   // Generate and download the ZIP
  //   const content = await zip.generateAsync({ type: "blob" });
  //   alert("Download completed!");
  //   saveAs(content, `${zipName || 'Drawing'}.zip`);
  // };

// Helper to create Complete Log Excel (DB-backed) and return as Blob
const createCompleteLogBlob = async (projectIdNum, pkgIdResolved) => {
  // Fetch drawings (include full history)
  const qp = new URLSearchParams({ projectId: String(projectIdNum), all: '1' });
  if (pkgIdResolved != null) qp.set('packageId', String(pkgIdResolved));
  const res = await fetch(`/api/project-drawings?${qp.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || res.statusText);
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No drawings found for Complete Log');
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Complete Log');

  // Header block
  ws.addRow(['PROJECT NAME', projectName || '', 'PACKAGE', selectedPackageName || (pkgIdResolved ? `#${pkgIdResolved}` : 'All')]);
  ws.addRow(['DATE', new Date().toISOString().slice(0,10)]);
  ws.addRow([]);

  // Columns and header
  ws.columns = [
    { key: 'sno', width: 6 },
    { key: 'drawingNo', width: 22 },
    { key: 'title', width: 36 },
    { key: 'category', width: 12 },
    { key: 'revision', width: 10 },
    { key: 'createdAt', width: 20 },
    { key: 'status', width: 14 },
    { key: 'fileNames', width: 40 },
  ];
  const headerRow = ws.addRow(['S.No', 'Drawing No', 'Title/Item', 'Category', 'Revision', 'Issue Date/Time', 'Status', 'File Name(s)']);
  headerRow.font = { bold: true };

  // Robust issueDate normalization: handles ISO strings, Date, or nested objects/metadata
  const normalizeIssueDate = (row) => {
    // Safely parse metadata/meta if they arrive as strings
    let metadata = row?.metadata;
    let meta = row?.meta;
    try { if (typeof metadata === 'string') metadata = JSON.parse(metadata); } catch {}
    try { if (typeof meta === 'string') meta = JSON.parse(meta); } catch {}

    // Try common keys (camelCase, snake_case, nested)
    let v = row?.issueDate
      ?? metadata?.issueDate
      ?? metadata?.issue_date
      ?? meta?.issueDate
      ?? meta?.issue_date
      ?? row?.createdAt;
    try {
      if (!v) return '';
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'string') {
        const iso = v.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) return iso[0];
        const d = new Date(v);
        if (!isNaN(d)) return d.toISOString().slice(0, 10);
        return v; // fallback raw string
      }
      if (typeof v === 'object') {
        if (v.$date) return String(v.$date).slice(0, 10);
        if (v.date) return String(v.date).slice(0, 10);
        // As a last resort, stringify
        const s = JSON.stringify(v);
        const iso = s.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) return iso[0];
      }
    } catch {}
    return '';
  };

  const normalizeCreatedAt = (row) => {
    // Prefer explicit createdAt; accept common variants if needed
    let v = row?.createdAt ?? row?.metadata?.createdAt ?? row?.meta?.createdAt;
    try {
      if (!v) return '';
      if (v instanceof Date) {
        const yyyy = v.getFullYear();
        const mm = String(v.getMonth() + 1).padStart(2, '0');
        const dd = String(v.getDate()).padStart(2, '0');
        const hh = String(v.getHours()).padStart(2, '0');
        const mi = String(v.getMinutes()).padStart(2, '0');
        const ss = String(v.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
      }
      if (typeof v === 'string') {
        // Try to extract 'YYYY-MM-DD HH:MM:SS' or build from Date
        const m = v.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
        if (m) return `${m[1]} ${m[2]}`;
        const d = new Date(v);
        if (!isNaN(d)) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
        }
        // Fallback to date-only if present
        const iso = v.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) return `${iso[0]} 00:00:00`;
        return v;
      }
      if (typeof v === 'object') {
        const raw = v.$date || v.date || JSON.stringify(v);
        if (typeof raw === 'string') {
          const m = raw.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
          if (m) return `${m[1]} ${m[2]}`;
          const d = new Date(raw);
          if (!isNaN(d)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
          }
          const iso = raw.match(/\d{4}-\d{2}-\d{2}/);
          if (iso) return `${iso[0]} 00:00:00`;
        }
      }
    } catch {}
    return '';
  };

  rows.forEach((r, idx) => {
    const drawingNo = r.drawingNumber || r.drgNo || '';
    const title = r.title || r.item || '';
    const category = r.category || '';
    const revision = r.revision || '';
  const issueDate = normalizeCreatedAt(r) || normalizeIssueDate(r);
    // Normalize status display: map historical 'SUSPENDED' -> 'VOID'
    const rawStatus = (r.status || '').toString();
    const status = rawStatus && rawStatus.toUpperCase() === 'SUSPENDED' ? 'VOID' : rawStatus;
    let fileNames = '';
    try {
      if (r.fileName) fileNames = String(r.fileName);
      else if (r.meta && Array.isArray(r.meta.fileNames)) fileNames = r.meta.fileNames.join(', ');
      else if (r.metadata && Array.isArray((r.metadata.fileNames))) fileNames = r.metadata.fileNames.join(', ');
    } catch {}
    const added = ws.addRow([
      idx + 1,
      drawingNo,
      title,
      category,
      revision,
      issueDate,
      status,
      fileNames,
    ]);
    if (String(status).toUpperCase() === 'VOID') {
      added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      added.font = { color: { argb: 'FF9C0006' } };
    }
  });

  const headerRowIndex = 4;
  ws.autoFilter = { from: { row: headerRowIndex, column: 1 }, to: { row: headerRowIndex + rows.length, column: 8 } };
  ws.getRow(headerRowIndex).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const handleDownload = async () => {
  // --- Get header info values from refs ---
  const fabricatorJobNo = jobNoRef.current?.value || '';
  const fabricatorCoordinator = coordinatorRef.current?.value || '';
  const solJobNo = solJobNoRef.current?.value || '';
  const fabricatorName = fabricatorNameRef.current?.value || '';
  const solTeamLeader = teamLeaderRef.current?.value || '';
  const zipName = zipNameRef.current?.value || '';

  // --- Calculate COUNT of drawings for "WE ARE SENDING YOU" section ---
  let newItemForApprovalQty = 0;
  let newItemForFabFieldQty = 0;
  let deletedItemQty = 0;
  let revisedItemForApprovalQty = 0; 
  let revisedItemForFabFieldQty = 0; 

  tableDrawings.forEach(d => {
    const hasDateSentForApproval = d.dateSentForApproval && d.dateSentForApproval.trim() !== '';
    const hasDateSentForFab = d.dateSentForFab && d.dateSentForFab.trim() !== '';

    if (d.void) {
      deletedItemQty++;
    } else if (hasDateSentForApproval) {
      newItemForApprovalQty++;
    } else if (hasDateSentForFab) {
      newItemForFabFieldQty++;
    }
  });

  const totalQty = tableDrawings.length;

  // --- PDF EXPORT (unchanged) ---
  const doc = new jsPDF('p', 'pt', 'a4');
  let y = 40;

  doc.setFontSize(14);
  doc.text('STRUCTURES ONLINE', 40, y);
  doc.setFontSize(10);
  doc.text('C 56A/27, Sec-62, Noida-201307', 40, y + 15);
  doc.text('Tel:+911202403056, www.structuresonline.net', 40, y + 30);
  doc.text('E:mail: mahesh_teli@sol-mail.net', 40, y + 45);

  doc.setFontSize(16);
  doc.text('LETTER OF TRANSMITTAL', 350, y + 10);

  // Minimal header content for PDF (reuse small subset)
  y += 80;
  const todayDate = new Date();
  const formattedDate = `${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}-${todayDate.getFullYear()}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`PROJECT NAME: ${projectName}`, 40, y + 30);
  doc.text(`DATE: ${formattedDate}`, 350, y);

  // Table generation (same grouping logic)
  let grouped = {};
  tableDrawings.forEach(item => {
    const desc = item.void ? `${item.desc} [VOID]` : item.desc;
    if (!grouped[desc]) grouped[desc] = [];
    grouped[desc].push(item.drawingNo);
  });

  const pdfTableHeaders = [['REV. REMARK', 'SHEET TITLE', 'SHEET NAME', 'SHEET QTY']];
  const pdfTableData = Object.entries(grouped).map(([desc, drawingNos]) => [
    'ISSUED FOR APPROVAL',
    desc,
    drawingNos.join(', '),
    drawingNos.length
  ]);

  autoTable(doc, {
    startY: y + 60,
    head: pdfTableHeaders,
    body: pdfTableData,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [0, 112, 192] },
    theme: 'grid'
  });

  const pdfBlob = doc.output('blob');

  // --- EXCEL EXPORT ---
  const wb = XLSX.utils.book_new();
  const headerSheetData = [
    ["FABRICATOR JOB NO.:", fabricatorJobNo, "FABRICATOR NAME:", fabricatorName],
    ["FABRICATOR CO-ORDINATOR:", fabricatorCoordinator, "SOL Team Leader:", solTeamLeader],
    ["SOL JOB NO.:", solJobNo, "PROJECT NAME:", projectName],
    [],
    [
      "S.No", "Description", "Drawing No", "Rev", "Date Sent for Approval",
      "Date Received BFA", "Date Sent For Fab/Field", "Remark", "Detailer",
      "Checker", "Sheet Size", "Item Qty"
    ]
  ];

  const tableSheetData = tableDrawings.map((item, i) => [
    i + 1,
    item.void ? `${item.desc} [VOID]` : item.desc,
    item.drawingNo,
    item.rev,
    item.dateSentForApproval,
    item.dateReceivedBFA,
    item.dateSentForFab,
    item.remark,
    item.detailer,
    item.checker,
    item.sheetSize,
    item.itemQty
  ]);

  const finalSheetData = [...headerSheetData, ...tableSheetData];
  const ws = XLSX.utils.aoa_to_sheet(finalSheetData);
  XLSX.utils.book_append_sheet(wb, ws, "Transmittal");

  const excelBlob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
    type: "application/octet-stream",
  });

  // --- Persist selected drawing filenames to ProjectDrawing (so SQL has latest fileName) ---
  try {
    // Resolve numeric clientId
    const clientIdNum = selectedClientId != null && /^\d+$/.test(String(selectedClientId))
      ? Number(selectedClientId)
      : null;
    // Resolve numeric projectId (prefer selectedProjectId; fallback by matching projectNo)
    let projectIdNum = selectedProjectId != null && /^\d+$/.test(String(selectedProjectId))
      ? Number(selectedProjectId)
      : null;
    if (!projectIdNum) {
      try {
        const pres = await fetch('/api/projects', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (pres.ok) {
          const pj = await pres.json();
          const found = (pj || []).find(p =>
            String(p.projectNo) === String(projectNo) ||
            String(p.name) === String(projectNo) ||
            String(p.projectName) === String(projectNo) ||
            String(p.id) === String(projectNo)
          );
          if (found) projectIdNum = Number(found.id);
        }
      } catch {}
    }

    // Helper: normalize category like TL screen
    const normalizeCategory = (cat) => {
      const c = String(cat || '').trim().toUpperCase();
      if (!c) return '';
      if (c === 'A' || c === 'G' || c === 'W') return c;
      if (c.startsWith('SHOP') || c === 'S') return 'A';
      if (c.startsWith('ERECTION') || c === 'E' || c === 'GA' || c.includes('GENERAL')) return 'G';
      if (c.includes('PART') || c.includes('COMPONENT') || c === 'P') return 'W';
      return c[0] || '';
    };

    // Helper: resolve packageId from API if not numeric
    const resolvePackageId = async (projId) => {
      // If store already has a numeric ID, use it
      if (selectedPackageId != null && /^\d+$/.test(String(selectedPackageId))) {
        return Number(selectedPackageId);
      }
      // Otherwise try to find by name/number for this project
      if (!projId) return undefined;
      try {
        const resp = await fetch(`/api/packages?projectId=${Number(projId)}`, { cache: 'no-store' });
        if (!resp.ok) return undefined;
        const list = await resp.json();
        const needle = String(selectedPackageName || '').trim().toLowerCase();
        if (!needle) return undefined;
        const match = (list || []).find(p => {
          const nm = String(p?.name || '').trim().toLowerCase();
          const pn = String(p?.packageNumber || '').trim().toLowerCase();
          return (nm && nm === needle) || (pn && pn === needle);
        });
        return match?.id != null ? Number(match.id) : undefined;
      } catch {
        return undefined;
      }
    };

    // Build entries from the on-screen table (ALL rows, not just with attachments)
    let entriesToUpsert = (tableDrawings || [])
      .map(d => ({
        drawingNumber: d.drawingNo || d.drgNo || '',
        category: normalizeCategory(d.category || ''),
        revision: d.rev || null,
        fileNames: (d.attachedPdfs || []).map(f => f?.name || f?.file?.name || '').filter(Boolean),
        issueDate: new Date().toISOString().slice(0,10),
      }))
      .filter(e => e.drawingNumber);

    if (clientIdNum && projectIdNum && entriesToUpsert.length > 0) {
      const pkgIdNum = await resolvePackageId(projectIdNum);
      // Fire-and-forget; don't block the download if this fails
      fetch('/api/project-drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdNum,
          projectId: projectIdNum,
          packageId: pkgIdNum,
          entries: entriesToUpsert,
        })
      }).catch(() => {});
    }
  } catch {}

  // --- ZIP LOGIC ---
  const zip = new JSZip();
  const rootFolder = zip.folder("Drawing");

  const getCategoryFolder = (cat) => {
    if (cat === "A") return "Shop Drawings";
    if (cat === "G") return "Erection Drawings";
    if (cat === "W") return "Part Drawings";
    return "Other Drawings";
  };

  (storeDrawings || []).forEach(d => {
    if (d.attachedPdfs && d.attachedPdfs.length) {
      const folderName = getCategoryFolder(d.category?.toString().trim());
      const subFolder = rootFolder.folder(folderName);
      d.attachedPdfs.forEach(file => {
        const actualFile = file?.file || file;
        subFolder.file(actualFile.name, actualFile);
      });
    }
  });
  const addToZipByExtension = (filesArray) => {
    if (!filesArray || !filesArray.length) return;
    filesArray.forEach((file) => {
      if (!file?.file && !(file instanceof File)) return;
      const actualFile = file?.file || file;
      const ext = actualFile.name.split('.').pop()?.toUpperCase() || "UNKNOWN";
      const extFolder = zip.folder(ext);
      extFolder.file(actualFile.name, actualFile);
    });
  };
  addToZipByExtension(approvedExtras);
  addToZipByExtension(approvedModels);

  // Naming:  DDMMYY_<ProjectName>_DrawingTransmittalLog
  const transBaseName = (transmittalName && transmittalName.trim()) || makeLogBase('DrawingTransmittalLog');
  zip.file(`${transBaseName}.pdf`, pdfBlob);
  zip.file(`${transBaseName}.xlsx`, excelBlob);

  // Optional: add Complete Log if enabled
  if (completeLogEnabled) {
    try {
      // Resolve projectId and packageId
      let projectIdNum = selectedProjectId != null && /^\d+$/.test(String(selectedProjectId)) ? Number(selectedProjectId) : null;
      if (!projectIdNum) {
        try {
          const pres = await fetch('/api/projects', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
          if (pres.ok) {
            const pj = await pres.json();
            const found = (pj || []).find(p =>
              String(p.projectNo) === String(projectNo) ||
              String(p.name) === String(projectNo) ||
              String(p.projectName) === String(projectNo) ||
              String(p.id) === String(projectNo)
            );
            if (found) projectIdNum = Number(found.id);
          }
        } catch {}
      }
      let pkgIdResolved = null;
      if (projectIdNum) {
        try {
          const resp = await fetch(`/api/packages?projectId=${Number(projectIdNum)}`, { cache: 'no-store' });
          if (resp.ok) {
            const list = await resp.json();
            const needle = String(selectedPackageName || '').trim().toLowerCase();
            const match = (list || []).find(p => {
              const nm = String(p?.name || '').trim().toLowerCase();
              const pn = String(p?.packageNumber || '').trim().toLowerCase();
              return (nm && nm === needle) || (pn && pn === needle);
            });
            if (match?.id != null) pkgIdResolved = Number(match.id);
          }
        } catch {}
      }
      if (projectIdNum) {
        const completeBlob = await createCompleteLogBlob(projectIdNum, pkgIdResolved);
        const completeBaseName = makeLogBase('DrawingCompleteLog');
        zip.file(`${completeBaseName}.xlsx`, completeBlob);
      }
    } catch (e) {
      console.warn('Complete Log generation skipped:', e?.message || e);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  alert("Download completed!");
  saveAs(content, `${zipName || 'Drawing'}.zip`);
};
// Publish: upsert to DB and upload the ZIP to storage
const handlePublish = async () => {
  const zipName = zipNameRef.current?.value || '';

  try {
  setUploadProgress(0);
  setUploadPhase('processing');
    setIsPublishing(true);

    // Validate required data before creating files
    let clientId = selectedClientId;
    if (!clientId || !Number.isFinite(Number(clientId))) {
      throw new Error('Please select a client in the PublishDrawing page before publishing.');
    }

    // Determine numeric projectId
    let projectIdToSend = null;
    try {
      const pres = await fetch('/api/projects', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (pres.ok) {
        const pj = await pres.json();
        const found = (pj || []).find(p =>
          String(p.projectNo) === String(projectNo) ||
          String(p.name) === String(projectNo) ||
          String(p.projectName) === String(projectNo) ||
          String(p.id) === String(projectNo)
        );
        if (found) projectIdToSend = found.id;
      }
    } catch {}

    if (!projectIdToSend || !Number.isFinite(Number(projectIdToSend))) {
      throw new Error(`Unable to determine project ID from "${projectNo}".`);
    }

  // Confirm project & package before proceeding
    const pkgDisplay = selectedPackageName || (selectedPackageId != null ? `#${selectedPackageId}` : 'None');
    const confirmed = window.confirm(`Confirm publish to:\n- Project: ${projectName} (ID ${projectIdToSend})\n- Package: ${pkgDisplay}\n\nProceed?`);
    if (!confirmed) { setIsPublishing(false); return; }

    // Normalizers
    const normalizeToken = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const stripFrTrSuffix = (token) => {
      if (!token) return token;
      const up = token.toUpperCase();
      if (up.endsWith('FR') || up.endsWith('TR')) return up.slice(0, -2);
      return up;
    };
    const normalizeCategory = (cat) => {
      const c = String(cat || '').trim().toUpperCase();
      if (!c) return '';
      if (c === 'A' || c === 'G' || c === 'W') return c;
      if (c.startsWith('SHOP') || c === 'S') return 'A';
      if (c.startsWith('ERECTION') || c === 'E' || c === 'GA' || c.includes('GENERAL')) return 'G';
      if (c.includes('PART') || c.includes('COMPONENT') || c === 'P') return 'W';
      return c[0] || '';
    };
    const normalizeDrawingKey = (drgNo, cat) => {
      const normDr = stripFrTrSuffix(normalizeToken(drgNo));
      const normCat = normalizeCategory(cat);
      return { normDr, normCat, key: `${normDr}::${normCat}` };
    };

    // Build entries for upsert from the on-screen table (ALL rows, not only with attachments)
    const entriesToUpsert = (tableDrawings || [])
      .map(d => {
        const drawingNumber = d.drawingNo || d.drgNo || d.drawingNo || '';
        const category = normalizeCategory(d.category || '');
        const { normDr } = normalizeDrawingKey(drawingNumber, category);
        const drawingToSend = drawingNumber; // keep original; DB will upsert on (project, drawing, category)
        return {
          drawingNumber: drawingToSend,
          category,
          revision: d.rev || null,
          fileNames: (d.attachedPdfs || []).map(f => f.name || f.file?.name || '').filter(Boolean),
          issueDate: new Date().toISOString().slice(0,10),
        };
      })
      .filter(e => e.drawingNumber);

    // Resolve numeric package id reliably (by id or by name via /api/packages)
    const resolvePackageId = async (projId) => {
      if (selectedPackageId != null && /^\d+$/.test(String(selectedPackageId))) return Number(selectedPackageId);
      if (!projId) return undefined;
      try {
        const resp = await fetch(`/api/packages?projectId=${Number(projId)}`, { cache: 'no-store' });
        if (!resp.ok) return undefined;
        const list = await resp.json();
        const needle = String(selectedPackageName || '').trim().toLowerCase();
        if (!needle) return undefined;
        const match = (list || []).find(p => {
          const nm = String(p?.name || '').trim().toLowerCase();
          const pn = String(p?.packageNumber || '').trim().toLowerCase();
          return (nm && nm === needle) || (pn && pn === needle);
        });
        return match?.id != null ? Number(match.id) : undefined;
      } catch { return undefined; }
    };
    const pkgIdResolved = await resolvePackageId(projectIdToSend);

    if (entriesToUpsert.length > 0) {
      // Enqueue publish-job only (no fallback to direct upsert). Worker owns DB writes.
      const enqueueResp = await fetch('/api/jobs/enqueue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'publish-job', payload: { clientId: Number(clientId), projectId: Number(projectIdToSend), packageId: pkgIdResolved, drawings: entriesToUpsert } })
      });
      if (!enqueueResp.ok) throw new Error('Failed to enqueue publish-job');
      const { jobId: publishJobId } = await enqueueResp.json();
      console.log('Enqueued publish-job', publishJobId);
    } else {
      console.log('No drawings with files selected to publish; skipping publish-job enqueue.');
    }

    // Upload each attached PDF to GCS first so worker can include them in the server-side ZIP.
    setUploadPhase('uploading');
    const uploadedObjectPaths = [];
    const allFilesToUpload = [];
    // Collect files from storeDrawings attachments
    (storeDrawings || []).forEach(d => {
      if (Array.isArray(d.attachedPdfs) && d.attachedPdfs.length) {
        const file = d.attachedPdfs[0]?.file || d.attachedPdfs[0];
        if (file instanceof File) allFilesToUpload.push({ file, drawing: d });
      }
    });

    // Upload files sequentially (to limit parallel uploads) and collect storage paths
    for (const entry of allFilesToUpload) {
      try {
        const uploadRes = await uploadToGCSDirect(entry.file, { clientId: Number(clientId), projectId: Number(projectIdToSend), packageId: pkgIdResolved || undefined });
        if (uploadRes?.record?.storagePath) uploadedObjectPaths.push(uploadRes.record.storagePath);
      } catch (e) {
        console.warn('Failed to upload attachment for drawing', entry.drawing?.drgNo, e?.message || e);
        // Continue uploading others; worker will skip missing ones
      }
    }

    // Enqueue server-side generate-zip with uploaded object paths; worker will produce final ZIP and log it
    const genResp = await fetch('/api/jobs/enqueue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'generate-zip', payload: { clientId: Number(clientId), projectId: Number(projectIdToSend), objectPaths: uploadedObjectPaths, zipName: zipName } })
    });
    if (!genResp.ok) throw new Error('Failed to enqueue generate-zip');
    const { jobId: genJobId } = await genResp.json();
    // Poll for generate-zip completion and show result (awaited)
    let jobResult = null;
    for (;;) {
      const s = await fetch(`/api/jobs/${genJobId}`);
      if (!s.ok) throw new Error('Job status fetch failed');
      const js = await s.json();
      const job = js && js.job ? js.job : js;
      if (!job) throw new Error('No job');
      if (job.status === 'succeeded') { jobResult = job.result; break; }
      if (job.status === 'failed') throw new Error(job.error || 'generate-zip failed');
      await new Promise(r => setTimeout(r, 1500));
    }
    setPublishResult({ success: true, data: jobResult, summary: { name: jobResult?.fileName || zipName, projectId: projectIdToSend } });
    setShowPublishModal(true);

    // Optional email notification
    const recipients = String(toEmails || '').trim();
    if (recipients) {
      try {
        let clientNameSafe = undefined;
        try {
          const cres = await fetch('/api/clients', { cache: 'no-store' });
          if (cres.ok) {
            const clist = await cres.json();
            const c = (clist || []).find(x => String(x.id) === String(selectedClientId));
            if (c?.name) clientNameSafe = c.name;
          }
        } catch {}
        const resp = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipients,
            subject: emailSubject || undefined,
            text: emailBody || undefined,
            clientName: clientNameSafe || undefined,
            projectName: projectName || undefined,
            submittalName: selectedPackageName || undefined,
            storagePath: (res?.record?.storagePath || res?.record?.storage_path || res?.objectPath || '').replace(/^gs:\/\/[^/]+\//, ''),
          })
        });
        const respJson = await resp.json().catch(() => ({}));
        if (resp.ok && (respJson?.sent === true)) {
          const count = Number(respJson?.to ?? 0) || recipients.split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
          setPublishResult(prev => ({ ...(prev || {}), email: { sent: true, to: count } }));
          alert(`Email sent successfully to ${count} recipient(s).`);
        } else {
          const errMsg = respJson?.error || resp.statusText || 'Unknown error';
          setPublishResult(prev => ({ ...(prev || {}), email: { sent: false, error: errMsg } }));
          alert(`Failed to send email: ${errMsg}`);
        }
      } catch (e) {
        const msg = e?.message || String(e);
        console.warn('Email notification failed:', msg);
        setPublishResult(prev => ({ ...(prev || {}), email: { sent: false, error: msg } }));
        alert(`Failed to send email: ${msg}`);
      }
    }
  } catch (e) {
    console.error('Publish failed:', e);
    let errorMessage = e?.message || String(e);
    if (e?.message?.includes('NetworkError')) {
      errorMessage = 'Network connection failed. Please check your internet connection and try again.';
    } else if (e?.message?.includes('fetch')) {
      errorMessage = 'Failed to connect to server. Please ensure the development server is running.';
    }
    setPublishResult({ success: false, error: errorMessage });
    setShowPublishModal(true);
  } finally {
    setIsPublishing(false);
    setUploadPhase(null);
  }
};



  // Modal open/close handlers


  const handleViewAttachment = useCallback((drawing) => {
    setModalFiles(drawing.attachedPdfs || []);
    setModalDrawingNo(drawing.drawingNo);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalFiles([]);
    setModalDrawingNo('');
  }, []);

  return (
    <div className="p-6 text-gray-800 space-y-4">
      <h1 className="text-center font-bold text-xl">{projectName}</h1>

      {/* Header Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <label>FABRICATOR JOB NO.:</label>
          <input ref={jobNoRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>FABRICATOR CO-ORDINATOR:</label>
          <input ref={coordinatorRef} className="border w-full px-2 py-1 rounded font-semibold" />
        </div>
        <div>
          <label>SOL JOB NO:</label>
          <input ref={solJobNoRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>FABRICATOR NAME:</label>
          <input ref={fabricatorNameRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>SOL Team Leader:</label>
          <input ref={teamLeaderRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>Transmittal Name:</label>
          <input value={transmittalName} readOnly className="border w-full px-2 py-1 rounded bg-gray-100" />
        </div>
        <div>
          <label>Submittal Name:</label>
          <input value={submittalName} readOnly className="border w-full px-2 py-1 rounded bg-gray-100" />
        </div>
        <div>
          <label>Zip Name:</label>
          <input value={zipName} onChange={(e)=> setZipName(e.target.value)} ref={zipNameRef} className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label>Complete Name:</label>
          <input ref={completeNameRef} className="border w-full px-2 py-1 rounded" />
        </div>
      </div>

      {/* Drawing Table */}
      <div className='overflow-x-auto border rounded mb-6'>
        <table className="w-full text-sm">
          <thead className="bg-cyan-800 text-white text-left">
            <tr>
              {[
                'S.No',
                'Description',
                'Drawing No',
                'Rev',
                'Date Sent for Approval',
                'Date Received BFA',
                'Date Sent For Fab./Field',
                'Remark',
                'Detailer',
                'Checker',
                'Sheet Size',
                'Item Qty',
                'Attachment'
              ].map(header => (
                <th key={header} className="p-4">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableDrawings.map((item, i) => (
              <tr key={item.id} className={item.void ? 'bg-red-200' : ''}>
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2">{item.void ? `${item.desc} [VOID]` : item.desc}</td>
                <td className="p-2 text-center">{item.drawingNo}</td>
                <td className="p-2 text-center">{item.rev}</td>
                <td className="p-2 text-center">{item.dateSentForApproval}</td>
                <td className="p-2 text-center">{item.dateReceivedBFA}</td>
                <td className="p-2 text-center">{item.dateSentForFab}</td>
                <td className="p-2">{item.remark}</td>
                <td className="p-2 text-center">{item.detailer}</td>
                <td className="p-2 text-center">{item.checker}</td>
                <td className="p-2 text-center">{item.sheetSize}</td>
                <td className="p-2 text-center">{item.itemQty}</td>
                <td className="p-2 text-center">
                  {item.attachedPdfs && item.attachedPdfs.length > 0 ? (
                    <span
                      className="text-blue-500 underline cursor-pointer"
                      onClick={() => handleViewAttachment(item)}
                    >
                      View
                    </span>
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
        <label className="flex items-center gap-1"><input type="checkbox" onChange={e => e.target.checked ? generateLogName('transmittal') : clearLogName('transmittal')} /> Transmittal Log</label>
        <label className="flex items-center gap-1"><input type="checkbox" onChange={e => e.target.checked ? generateLogName('submittal') : clearLogName('submittal')} /> Submittal Log</label>
  <label className="flex items-center gap-1"><input type="checkbox" onChange={(e)=> setCompleteLogEnabled(e.target.checked)} /> Complete Log</label>
      </div>

      {/* Email Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-1">
          <label className="text-sm">Recipients (comma/semicolon separated):</label>
          <input
            value={toEmails}
            onChange={(e) => setToEmails(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="email1@example.com; email2@example.com"
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm">Subject</label>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Subject"
            />
          </div>
          <div>
            <label className="text-sm">Body</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full border p-2 rounded min-h-[120px]"
              placeholder="Write your email message here..."
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={async () => { setIsPublishing(true); await handlePublish(); }}
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900"
          disabled={isPublishing}
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900">Save</button>
        <button
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDownload}
          disabled={!tableDrawings.some(d => Array.isArray(d.attachedPdfs) && d.attachedPdfs.length > 0)}
          title={!tableDrawings.some(d => Array.isArray(d.attachedPdfs) && d.attachedPdfs.length > 0) ? 'Attach at least one PDF drawing first' : undefined}
        >
          Download
        </button>
        
        <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" onClick={() => router.push("/dashboard/project/project/publish_drawings/hybrid_publish_drawings")}>Back For Correction</button>
      </div>

      {/* Upload Progress UI for Publish */}
      {isPublishing && (
        uploadPhase === 'processing' ? (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
              <div className="h-3 w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 animate-pulse"></div>
            </div>
            <div className="text-xs text-gray-700 mt-1">Processing… preparing files and saving records</div>
          </div>
        ) : (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded h-3">
              <div
                className="bg-blue-600 h-3 rounded"
                style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 mt-1">{uploadProgress}%</div>
          </div>
        )
      )}

      {/* Publish confirmation modal (printable) */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[600px] p-4 shadow-lg relative">
            <button
              onClick={() => setShowPublishModal(false)}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <h2 className="font-bold mb-2">Publish Result</h2>
            {publishResult?.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">✓</span>
                  <p className="font-medium text-green-700">Publish succeeded</p>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-sm font-medium">Summary</div>
                  <div className="p-3 text-sm">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="text-gray-500">Name</div>
                      <div className="font-medium truncate" title={publishResult?.summary?.name || publishResult?.data?.record?.fileName}>{publishResult?.summary?.name || publishResult?.data?.record?.fileName || '-'}</div>
                      <div className="text-gray-500">Client ID</div>
                      <div className="font-medium">{publishResult?.summary?.clientId ?? '-'}</div>
                      <div className="text-gray-500">Project ID</div>
                      <div className="font-medium">{publishResult?.summary?.projectId ?? '-'}</div>
                      <div className="text-gray-500">Upload time</div>
                      <div className="font-medium">{publishResult?.summary?.uploadTime ? new Date(publishResult.summary.uploadTime).toLocaleString() : '-'}</div>
                    </div>
                    {publishResult?.data?.record?.storagePath && (
                      <div className="mt-3 text-xs text-gray-500">
                        <span className="mr-1">Storage:</span>
                        <span className="font-mono break-all">{publishResult.data.record.storagePath}</span>
                      </div>
                    )}
                  </div>
                </div>
                {publishResult?.email && (
                  <div className="mt-1 text-sm">
                    {publishResult.email.sent ? (
                      <p className="text-green-700">Email: Sent to {publishResult.email.to || 0} recipient(s).</p>
                    ) : (
                      <p className="text-red-700">Email: Failed{publishResult.email.error ? ` — ${publishResult.email.error}` : ''}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-red-600">Publish failed.</p>
                <pre className="text-xs bg-gray-100 p-2 rounded">{publishResult?.error}</pre>
                {publishResult?.email && (
                  <div className="mt-3 text-sm">
                    {publishResult.email.sent ? (
                      <p className="text-green-700">Email: Sent to {publishResult.email.to || 0} recipient(s).</p>
                    ) : (
                      <p className="text-red-700">Email: Failed{publishResult.email.error ? ` — ${publishResult.email.error}` : ''}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => window.print()}
                className="bg-blue-700 text-white px-4 py-1 text-sm rounded"
              >
                Print
              </button>
              <button onClick={() => setShowPublishModal(false)} className="bg-gray-400 text-white px-4 py-1 text-sm rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[600px] p-4 shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <h2 className="font-bold mb-2">Attachments for Drawing {modalDrawingNo}</h2>
            <table className="w-full border">
              <thead>
                <tr className="bg-cyan-800 text-white text-sm">
                  <th className="p-2 text-left font-semibold">Name</th>
                  <th className="p-2 text-left font-semibold">Download</th>
                </tr>
              </thead>
              <tbody>
                {modalFiles.map((file, idx) => (
                  <tr key={file.name || idx} className="border-t text-sm">
                    <td className="p-2">{file.name}</td>
                    <td className="p-2">
                      <button
                        className="text-blue-600 underline"
                        onClick={() => {
                          const blobOrFile = file.file || file;
                          if (blobOrFile) {
                            const url = URL.createObjectURL(blobOrFile);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = file.name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-1 text-sm rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransmittalForm;