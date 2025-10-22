'use client';

import React, { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import useDrawingStore from '../../../stores/useDrawingStore';
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/* ================= Helpers & Constants (plain JS, no TS types) ================= */

const safeArr = (v) => (Array.isArray(v) ? v : []);

// Robust matcher: does a project belong to a given client id?
// Checks multiple common field variants to be resilient to schema drift.
const matchesClient = (proj, clientId) => {
  if (!proj) return false;
  const cid = String(clientId ?? '');
  if (!cid) return false;
  const cand = [
    proj.clientId,
    proj?.client?.id,
    proj.ownerId,
    // tolerate legacy/variant field names
    proj.client_id,
    proj.clientID,
    proj.clientid,
    proj.customerId,
    proj.owner_id,
    proj.ClientId,
    proj.ClientID,
    proj?.Client?.id,
  ];
  return cand.some((v) => v != null && String(v) === cid);
};

// Tiny info popover – same UX as Code #1
const InfoPopover = ({ title = 'Info', children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="relative inline-block align-middle" ref={ref}>
      <button
        type="button"
        aria-label={`${title} help`}
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
        title={title}
      >
        i
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-80 max-w-[80vw] rounded-md border border-gray-200 bg-white text-gray-800 shadow-lg top-full left-0">
          <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-white border-l border-t border-gray-200" />
          <div className="p-3 text-xs leading-relaxed">
            <div className="mb-1 font-semibold">{title}</div>
            <div className="text-gray-700">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatOptions = [
  "Project-Drg-Revision",
  "Drg-Revision",
  "Drg",
  "Project-Drg(Revision)",
  "Project_Drg_Revision",
  "Drg_Revision",
  "Project_Drg(Revision)",
  "%Drg%#Revision#",
];

const formatRegexMap = {
  "Project-Drg-Revision": /^[\w\d]+-[\w\d]+-[\w\d]+\.pdf$/i,
  "Drg-Revision": /^[\w\d]+-[\w\d]+\.pdf$/i,
  "Drg": /^[\w\d]+\.pdf$/i,
  "Project-Drg(Revision)": /^[\w\d]+-[\w\d]+\([\w\d]+\)\.pdf$/i,
  "Project_Drg_Revision": /^[\w\d]+_[\w\d]+_[\w\d]+\.pdf$/i,
  "Drg_Revision": /^[\w\d]+_[\w\d]+\.pdf$/i,
  "Project_Drg(Revision)": /^[\w\d]+_[\w\d]+\([\w\d]+\)\.pdf$/i,
  "%Drg%#Revision#": /^.+#.+#\.pdf$/i,
};

const normalizeToken = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const stripFrTrSuffix = (token) => {
  if (!token) return token;
  const up = token.toUpperCase();
  if (up.endsWith('FR') || up.endsWith('TR')) return up.slice(0, -2);
  return up;
};
// Normalize category to canonical A/G/W when possible; otherwise empty or first letter uppercased
const normalizeCategory = (cat) => {
  const c = String(cat || '').trim().toUpperCase();
  if (!c) return '';
  // direct A/G/W
  if (c === 'A' || c === 'G' || c === 'W') return c;
  // common synonyms
  if (c.startsWith('SHOP') || c === 'S') return 'A';
  if (c.startsWith('ERECTION') || c === 'E' || c === 'GA' || c.includes('GENERAL')) return 'G';
  if (c.includes('PART') || c.includes('COMPONENT') || c === 'P') return 'W';
  // fallback
  return c[0] || '';
};
const normalizeDrawingKey = (drgNo, cat) => {
  const normDr = stripFrTrSuffix(normalizeToken(drgNo));
  const normCat = normalizeCategory(cat);
  return { normDr, normCat, key: `${normDr}::${normCat}` };
};
const getLeadingToken = (name) => {
  const base = String(name || '');
  const start = base.search(/[A-Za-z0-9]/);
  if (start === -1) return '';
  let end = start;
  while (end < base.length && /[A-Za-z0-9]/.test(base[end])) end++;
  return base.slice(start, end).trim();
};

// Attach-conflict rule: use the LAST ALPHABET in the filename as the revision
const extractRevisionFromFileName = (fileName) => {
  if (!fileName) return null;
  const base = fileName.replace(/\.pdf$/i, "");
  // Scan from end to find the last alphabet character
  for (let i = base.length - 1; i >= 0; i--) {
    const ch = base[i];
    if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) return ch.toUpperCase(); // single last alphabet
  }
  return null; // no digit found
};

// Compare Excel rev (cell) to the last alphabet from filename; only this rule affects attach conflict
const checkRevisionMatch = (drawingRev, fileName) => {
  const revCellRaw = (drawingRev ?? '').toString().trim();
  const revCell = revCellRaw === '-' ? '' : revCellRaw;
  const lastAlpha = extractRevisionFromFileName(fileName);
  // If neither has a revision, it's fine
  if (!revCell && lastAlpha == null) return true;
  // If one is missing, mismatch
  if (!!revCell !== (lastAlpha != null)) return false;
  // Case-insensitive letter compare (Excel rev may be letter)
  return String(revCell).trim().toUpperCase() === String(lastAlpha).trim().toUpperCase();
};


// Signed URL helper from Code #1 (present here, but **not used** on this page for Extras/3D)
const uploadFileToS3 = async (file, { projectId = null, clientId = null } = {}) => {
  const r = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      clientId,
      projectId,
    }),
  });
  if (!r.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, destinationPath } = await r.json();

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

  // Optional logging (kept for parity with Code #1, but not called here)
  await fetch('/api/upload-log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientId,
      projectId,
      originalName: file.name,
      storagePath: `gs://${process.env.NEXT_PUBLIC_GCS_BUCKET || ''}/${destinationPath}`,
      size: file.size,
    }),
  });

  return { destinationPath };
};

/* ================= Component ================= */

const PublishDrawing = () => {
  const router = useRouter();
  const {
    setProjectDetails,
    setSelectedClientId: setStoreSelectedClientId,
    setSelectedProjectId,
    setSelectedPackage,
    setApprovedDrawings,
    setApprovedExtras,
    setApprovedModels,
    setDrawings,
    setExtras,
    setModels,
    drawings,
    extras,
    models,
    projectNo,
    projectName,
  } = useDrawingStore();

  // Local/UI state
  const [uploadedExcelFiles, setUploadedExcelFiles] = useState([]); // keep File[] for ZIP
  const [activeTab, setActiveTab] = useState("Drawings");
  const [excelFileData, setExcelFileData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [baseProjects, setBaseProjects] = useState([]); // allowed projects for current user
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedProjectId, setLocalSelectedProjectId] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Previous submissions (per package) UI state
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);
  const [prevError, setPrevError] = useState('');
  const [prevRows, setPrevRows] = useState([]);
  // Map of previous revisions for current package: key `${drawingNo}::${category}` -> revision
  const [prevRevMap, setPrevRevMap] = useState({});
  const [prevRevLoading, setPrevRevLoading] = useState(false);
  const [prevRevError, setPrevRevError] = useState('');
  const [prevRevHasFetched, setPrevRevHasFetched] = useState(false);

  // Fetch previous revisions for selected project/package and build a map
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedProjectId || !selectedPackageId) { setPrevRevMap({}); setPrevRevError(''); setPrevRevHasFetched(false); return; }
      setPrevRevLoading(true); setPrevRevError(''); setPrevRevHasFetched(false);
      try {
        const url = `/api/project-drawings?projectId=${Number(selectedProjectId)}&packageId=${Number(selectedPackageId)}`;
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Failed to load prev revisions (${r.status})`);
        const arr = await r.json();
        // Keep full rows for modal and to enrich prevRevMap
        if (!cancelled) setPrevRows(Array.isArray(arr) ? arr : []);
        const map = {};
        if (Array.isArray(arr)) {
          // Choose latest by updatedAt or lastAttachedAt
          for (const row of arr) {
            const dr = row?.drawingNumber ?? row?.drgNo ?? row?.drg_no;
            if (!dr) continue;
            const catRaw = row?.category ?? row?.Category ?? '';
            const { normDr, normCat, key } = normalizeDrawingKey(dr, catRaw);
            const ts = new Date(row?.updatedAt || row?.updated_at || row?.lastAttachedAt || row?.lastattachedat || 0).getTime();
            const prev = map[key];
            if (!prev || ts > prev._ts) {
              const revVal = String(row?.revision ?? row?.rev ?? '').trim();
              map[key] = { rev: revVal, _ts: ts };
              // also store a category-agnostic fallback for this drawing number
              const keyNoCat = normDr;
              const prev2 = map[keyNoCat];
              if (!prev2 || ts > prev2._ts) {
                map[keyNoCat] = { rev: revVal, _ts: ts };
              }
              // filename-based mapping (from metadata/meta.fileNames or fileName list)
              const collectNames = () => {
                const acc = [];
                const md = row?.metadata;
                if (md) {
                  try {
                    const obj = typeof md === 'string' ? JSON.parse(md) : md;
                    if (obj && Array.isArray(obj.fileNames)) acc.push(...obj.fileNames);
                  } catch {}
                }
                const m2 = row?.meta;
                if (m2) {
                  try {
                    const obj2 = typeof m2 === 'string' ? JSON.parse(m2) : m2;
                    if (obj2 && Array.isArray(obj2.fileNames)) acc.push(...obj2.fileNames);
                  } catch {}
                }
                const fn = row?.fileName;
                if (typeof fn === 'string' && fn.trim()) acc.push(...fn.split(/\s*,\s*/).filter(Boolean));
                return acc;
              };
              const fns = collectNames();
              for (const name of fns) {
                const k = `file::${String(name).trim().toLowerCase()}`;
                const prevF = map[k];
                if (!prevF || ts > prevF._ts) map[k] = { rev: revVal, _ts: ts };
              }
            }
          }
        }
        if (!cancelled) {
          // Strip helper _ts
          const out = {};
          for (const k of Object.keys(map)) out[k] = map[k].rev ?? '';
          setPrevRevMap(out);
        }
      } catch (e) {
        if (!cancelled) setPrevRevError(e?.message || 'Failed loading previous revisions');
      } finally {
        if (!cancelled) { setPrevRevLoading(false); setPrevRevHasFetched(true); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedProjectId, selectedPackageId, drawings]);

  const [selectedRows, setSelectedRows] = useState(new Set());                 // drawings table
  const [selectedAttachmentRows, setSelectedAttachmentRows] = useState(new Set()); // attachments (extras + models)

  const [showModal, setShowModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [modalDrawingId, setModalDrawingId] = useState(null);
  const [selectedModalFiles, setSelectedModalFiles] = useState(new Set());

  const [drawingExtras, setDrawingExtras] = useState([]); // history of matched PDFs
  const [selectedFormat, setSelectedFormat] = useState("");
  const [pendingExtraFiles, setPendingExtraFiles] = useState([]); // PDFs to attach to drawings

  const [pendingAttachments, setPendingAttachments] = useState([]); // staged Extras/3D (no cloud here)

  // Refs
  const excelInputRef = useRef(null);
  const pdfDrawingsInputRef = useRef(null);
  const extrasUploadRef = useRef(null);
  const modelInputRef = useRef(null);

  // Strict step-order guards
  const canSelectProject = selectedClientId != null && String(selectedClientId) !== '';
  const canSelectPackage = !!selectedProjectId;
  const canUploadExcel = canSelectPackage; // require client + project + package before Excel
  const canAttachPDF = canSelectPackage && (Array.isArray(drawings) && drawings.length > 0); // require drawings added from Excel

  /* ====== DrgNo variants map for matching ====== */
  const drgNoMap = useMemo(() => {
    const map = {};
    const list = Array.isArray(drawings) ? drawings : [];
    for (const row of list) {
      const raw = row?.drgNo;
      if (raw == null) continue;
      const base = String(raw).trim();
      if (!base || base === '-' || base.toLowerCase() === 'na') continue;
      const variants = [
        normalizeToken(base),
        normalizeToken(base.replace(/[^\w\d]/g, "")),
        normalizeToken(base.replace(/[\s_-]/g, "")),
      ];
      for (const v of variants) {
        if (!v) continue;
        if (!map[v]) map[v] = [];
        map[v].push(row);
      }
    }
    return map;
  }, [drawings]);

  const inferCategoryFromFilename = useCallback((name) => {
    const n = String(name || '').toLowerCase();
    if (/(\bmain\s*part\b|\bpart\b|\bcomponent\b|\bprt\b)/i.test(n)) return 'W'; // Part
    if (/(\berection\b|\bga\b|general\s*arrangement|\begd\b)/i.test(n)) return 'G'; // Erection
    return 'A'; // Shop
  }, []);

  const resolveRowForToken = useCallback((token, fileName) => {
    if (!token) return null;
    const candidates = drgNoMap[token];
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const preferredCat = inferCategoryFromFilename(fileName);
    const orderFor = (pref) => (pref === 'W' ? ['W', 'A', 'G'] : pref === 'G' ? ['G', 'A', 'W'] : ['A', 'W', 'G']);
    const order = orderFor(preferredCat);
    const catOf = (row) => String(row?.category || '').trim().toUpperCase();

    const grouped = candidates.reduce((acc, r) => {
      const c = catOf(r) || '';
      (acc[c] ||= []).push(r);
      return acc;
    }, {});

    for (const c of order) {
      if (grouped[c] && grouped[c].length) {
        const without = grouped[c].find((r) => !Array.isArray(r.attachedPdfs) || r.attachedPdfs.length === 0);
        return without || grouped[c][0];
      }
    }
    const withoutAny = candidates.find((r) => !Array.isArray(r.attachedPdfs) || r.attachedPdfs.length === 0);
    return withoutAny || candidates[0];
  }, [drgNoMap, inferCategoryFromFilename]);

  const attachmentStats = useMemo(() => {
    const list = Array.isArray(drawings) ? drawings : [];
    const total = list.length;
    let attached = 0;
    for (const d of list) {
      if (Array.isArray(d.attachedPdfs) && d.attachedPdfs.length > 0) attached++;
    }
    const missing = Math.max(total - attached, 0);
    return { attached, total, missing };
  }, [drawings]);

  /* ====== Revision sequence validation (client-side only, using Rev column) ====== */
  const revisionConflicts = useMemo(() => {
    // If we're expecting DB previous revisions, wait until they load to avoid false warnings
    if (selectedProjectId && selectedPackageId && (prevRevLoading || !prevRevHasFetched)) {
      return new Map();
    }
    // Group rows by normalized DrgNo
    const byDrg = new Map();
    safeArr(drawings).forEach((row) => {
      const key = normalizeToken(row?.drgNo || '');
      if (!key) return;
      if (!byDrg.has(key)) byDrg.set(key, []);
      byDrg.get(key).push(row);
    });

    const conflicts = new Map(); // rowId -> message

    const isLetter = (r) => /^[A-Za-z]$/.test(String(r || '').trim());
    const isNumber = (r) => /^\d+$/.test(String(r || '').trim());

    for (const [, rows] of byDrg.entries()) {
      // Collect existing revisions in this batch (letters and numbers)
      const letterSet = new Set();
      const numberSet = new Set();
      rows.forEach((r) => {
        const rev = String(r?.rev ?? '').trim();
        if (!rev || rev === '-') return;
        if (isLetter(rev)) letterSet.add(rev.toUpperCase());
        else if (isNumber(rev)) numberSet.add(rev);
      });

      rows.forEach((r) => {
        const revRaw = String(r?.rev ?? '').trim();
        const id = r?.id;
        if (!id) return;
        if (!revRaw || revRaw === '-') return; // no revision -> no conflict

        const dr = r?.drgNo ?? r?.drawingNo;
        const catRaw = r?.category ?? '';
        const { normDr, normCat } = normalizeDrawingKey(dr, catRaw);
        const prevDb = prevRevMap?.[`${normDr}::${normCat}`] ?? prevRevMap?.[normDr] ?? '';
        // If we rely on DB history, but it's not loaded, skip conflicts.
        if (selectedProjectId && selectedPackageId && (prevRevLoading || !prevRevHasFetched)) return;

        const revU = revRaw.toUpperCase();
        if (isLetter(revRaw)) {
          if (prevDb && /^[A-Za-z]$/.test(String(prevDb))) {
            // DB prev exists and is a letter: require immediate next
            const prevU = String(prevDb).trim().toUpperCase();
            if (revU.charCodeAt(0) !== prevU.charCodeAt(0) + 1) {
              conflicts.set(id, `Invalid progression from '${prevU}' to '${revU}'`);
            }
            return; // handled via DB
          }
          // No DB prev: validate within-batch minimal continuity
          if (revU === 'A') return; // first allowed
          const prevLetter = String.fromCharCode(revU.charCodeAt(0) - 1);
          if (!letterSet.has(prevLetter)) {
            conflicts.set(id, `Missing previous revision ${prevLetter} before ${revU}`);
          }
        } else if (isNumber(revRaw)) {
          if (prevDb && /^\d+$/.test(String(prevDb))) {
            const prevNum = Number(prevDb);
            const curNum = Number(revRaw);
            if (curNum !== prevNum + 1) {
              conflicts.set(id, `Invalid progression from '${prevDb}' to '${revRaw}'`);
            }
            return; // handled via DB
          }
          // No DB prev: allow 1 as starting point; otherwise ensure immediate previous number exists in batch
          const curNum = Number(revRaw);
          if (curNum === 1) return;
          if (!numberSet.has(String(curNum - 1))) {
            conflicts.set(id, `Missing previous revision ${curNum - 1} before ${curNum}`);
          }
        } else {
          // Unknown format – flag softly
          conflicts.set(id, `Unrecognized revision '${revRaw}'`);
        }
      });
    }

    // Also compare against previous revision from DB for selected package (normalized DrgNo + category)
    const isValidStep = (prev, next) => {
      const p = (prev ?? '').toString().trim();
      const n = (next ?? '').toString().trim();
      if (!p && !n) return true; // nothing provided
      if (!p && n) return n.toUpperCase() === 'A' || (isNumber(n) && Number(n) === 1);
      if (!n) return true; // don't flag empty new rev as conflict here
      if (isLetter(p) && isLetter(n)) return n.toUpperCase().charCodeAt(0) === p.toUpperCase().charCodeAt(0) + 1;
      if (isNumber(p) && isNumber(n)) return Number(n) === Number(p) + 1;
      return true;
    };
    safeArr(drawings).forEach((row) => {
      if (!row?.id) return;
      const dr = row?.drgNo ?? row?.drawingNo;
      if (!dr) return;
      const catKeyRaw = row?.category ?? '';
      const { normDr, normCat } = normalizeDrawingKey(dr, catKeyRaw);
      const prev = prevRevMap?.[`${normDr}::${normCat}`] ?? prevRevMap?.[normDr] ?? '';
      const next = row?.rev ?? '';
      if (!conflicts.has(row.id) && !isValidStep(prev, next)) {
        conflicts.set(row.id, `Invalid progression from '${prev || '-'}' to '${next || '-'}'`);
      }
    });

    return conflicts; // Map of id -> message
  }, [drawings, prevRevMap, prevRevLoading, prevRevHasFetched, selectedProjectId, selectedPackageId]);

  /* ====== Project pickers (same as Code #1) ====== */
  const handleProjectChange = useCallback((e) => {
    const selectedRaw = e.target.value;
    // Resolve selected project by matching against both projectNo and id (string/number tolerant)
    const selectedProject = projects.find(p =>
      String(p?.projectNo ?? '') === String(selectedRaw) || String(p?.id ?? '') === String(selectedRaw)
    ) || null;

    // Update global store display fields
    useDrawingStore.setState({
      projectNo: selectedProject ? (selectedProject.projectNo ?? selectedProject.id) : selectedRaw,
      projectName: selectedProject ? (selectedProject.name || selectedProject.projectName || '') : '',
    });

    // Resolve numeric project id
    const pidNum = selectedProject && selectedProject.id != null ? Number(selectedProject.id) : NaN;
    const pid = Number.isFinite(pidNum) ? pidNum : null;
    setLocalSelectedProjectId(pid);
    setSelectedProjectId(pid || null);

    // Load packages for this project
    if (pid) {
      fetch(`/api/packages?projectId=${pid}`)
        .then(r => (r.ok ? r.json() : []))
        .then(arr => setPackages(Array.isArray(arr) ? arr : []))
        .catch(() => setPackages([]));
      setSelectedPackageId('');
      setSelectedPackage(null);
    } else {
      setPackages([]);
      setSelectedPackageId('');
      setSelectedPackage(null);
    }
  }, [projects]);

  React.useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoadingProjects(true);
      setLoadingClients(true);
      try {
        // Prefer server-side filtering for projects to reduce client-side mismatches
        const results = await Promise.allSettled([
          fetch('/api/users/me', { cache: 'no-store' }),
          // ask server to scope by TL when possible; server will use session for non-admins
          fetch('/api/projects?scope=tl', { cache: 'no-store' }),
          fetch('/api/clients', { cache: 'no-store' }),
        ]);

        const ures = results[0], pres = results[1], cres = results[2];
        let udata = null;
        if (ures.status === 'fulfilled' && ures.value?.ok) {
          try { udata = await ures.value.json(); } catch { udata = null; }
        }
        let plist = [];
        if (pres.status === 'fulfilled' && pres.value?.ok) {
          try { plist = await pres.value.json(); } catch { plist = []; }
        }
        let clist = [];
        if (cres.status === 'fulfilled' && cres.value?.ok) {
          try { clist = await cres.value.json(); } catch { clist = []; }
        }

  if (mounted) setAllProjects(plist || []);

        // Decide base projects for this user:
        // 1) If user has any projects where solTLId === user.id, treat as TL-mode (regardless of userType label)
        const tlIdNum = Number(udata?.id);
        const tlProjects = (plist || []).filter(p => Number(p?.solTLId || p?.solTL?.id) === tlIdNum);
        if ((udata && String(udata.userType || '').toLowerCase() !== 'admin') && tlProjects.length > 0) {
          const base = tlProjects;
          const tlClientIds = new Set(base.map(p => Number(p?.clientId || p?.client?.id)).filter(Boolean));
          let tlClientsArr = (clist || []).filter(c => tlClientIds.has(Number(c.id)));
          // Fallback: infer clients directly from projects if clients API is empty or filtering yields none
          if (!tlClientsArr.length) {
            const seen = new Set();
            tlClientsArr = base.map(p => {
              const id = Number(p?.clientId || p?.client?.id);
              const name = (p?.client?.name) || `Client ${id}`;
              return id ? { id, name } : null;
            }).filter(Boolean).filter(c => {
              if (seen.has(c.id)) return false; seen.add(c.id); return true;
            });
          }
          if (mounted) {
            setBaseProjects(base);
            setClients(tlClientsArr);
            // Auto-select first client and filter projects accordingly
            const firstId = tlClientsArr.length ? Number(tlClientsArr[0].id) : null;
            setSelectedClientId(firstId);
            setStoreSelectedClientId(firstId);
            setProjects(firstId != null ? base.filter(p => Number(p.clientId) === firstId || Number(p?.client?.id) === firstId || Number(p?.ownerId) === firstId) : base);
          }
  } else if (udata && String(udata.userType || '').toLowerCase() !== 'admin') {
          // 2) Client-mode: if user tied to a client, show only that client's projects
          const cid = udata.clientId || udata.client?.id || null;
          const base = cid != null ? (plist || []).filter(p => Number(p.clientId) === Number(cid) || Number(p?.client?.id) === Number(cid) || Number(p?.ownerId) === Number(cid)) : (plist || []);
          if (mounted) {
            setBaseProjects(base);
            // If clients API empty, infer clients from base
            if (clist && clist.length) setClients(clist);
            else {
              const seen = new Set();
              const inferred = base.map(p => {
                const id = Number(p?.clientId || p?.client?.id);
                const name = (p?.client?.name) || `Client ${id}`;
                return id ? { id, name } : null;
              }).filter(Boolean).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
              setClients(inferred);
            }
            setSelectedClientId(cid != null ? Number(cid) : null);
            setProjects(base);
          }
        } else {
          // 3) Admin: all
          if (mounted) {
            setBaseProjects(plist || []);
            if (clist && clist.length) setClients(clist);
            else {
              const seen = new Set();
              const inferred = (plist || []).map(p => {
                const id = Number(p?.clientId || p?.client?.id);
                const name = (p?.client?.name) || `Client ${id}`;
                return id ? { id, name } : null;
              }).filter(Boolean).filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
              setClients(inferred);
            }
            setProjects(plist || []);
          }
        }
        if (mounted) setUser(udata);

        if (selectedClientId != null && udata && udata.userType && String(udata.userType).toLowerCase() !== 'admin') {
          plist = (plist || []).filter(p =>
            Number(p.clientId) === Number(selectedClientId) || Number(p?.client?.id) === Number(selectedClientId) || Number(p?.ownerId) === Number(selectedClientId)
          );
        }

        if (mounted) setProjects(plist || []);
      } catch (e) {
        console.warn('Failed to fetch user/projects/clients', e);
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
        if (mounted) setLoadingClients(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (selectedClientId == null || String(selectedClientId) === '') { setProjects(baseProjects || []); return; }
    const cid = String(selectedClientId);
    // Try server-side filtered list first
    (async () => {
      try {
        // include scope=tl to only get TL-visible projects for this client
        const r = await fetch(`/api/projects?clientId=${encodeURIComponent(cid)}&scope=tl`, { cache: 'no-store' });
        if (r.ok) {
          const arr = await r.json();
          if (Array.isArray(arr) && arr.length) { setProjects(arr); return; }
        }
      } catch {}
      const filtered = (baseProjects || []).filter(p => matchesClient(p, cid));
      console.info('[PublishDrawing] Effect filter projects (fallback)', { clientId: cid, baseCount: (baseProjects || []).length, filteredCount: filtered.length });
      setProjects(filtered.length ? filtered : (baseProjects || []));
    })();
  }, [selectedClientId, baseProjects]);

  // Keep global store's selectedPackage in sync with local selection and loaded packages
  React.useEffect(() => {
    // When a package is selected locally, propagate the full object to the store
    if (selectedPackageId) {
      const pkg = (packages || []).find(p => String(p.id) === String(selectedPackageId));
      setSelectedPackage(pkg || null);
    } else {
      setSelectedPackage(null);
    }
  }, [selectedPackageId, packages, setSelectedPackage]);

  /* ====== Extras / 3D: stage locally ONLY (no cloud here) ====== */
  const handleFileChange = useCallback((e, type) => {
    if (!useDrawingStore.getState().projectNo) return alert("Please select a Project No. first.");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (type === "Extras" || type === "3D Model") {
      const staged = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        fileType: type,
        uploaded: true, // staged and ready (local)
        uploadedAt: new Date().toISOString(),
        file,          // keep actual File to put in ZIP later
      }));
      
      // Directly add to the main tables instead of pending
      if (type === 'Extras') {
        const merged = [...safeArr(extras), ...staged];
        const result = merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
        console.log('Setting extras to:', result);
        setExtras(result);
      } else {
        const merged = [...safeArr(models), ...staged];
        const result = merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
        console.log('Setting models to:', result);
        setModels(result);
      }
      
      setSelectedAttachmentRows(new Set());
    }

    if (e?.target) e.target.value = "";
  }, [extras, models, setExtras, setModels]);

  const handleAttachPending = useCallback((id) => {
    const item = pendingAttachments.find((p) => p.id === id);
    if (!item) return;

    if (item.fileType === 'Extras') {
      setExtras((current) => {
        const merged = [...safeArr(current), item];
        return merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
      });
    } else {
      setModels((current) => {
        const merged = [...safeArr(current), item];
        return merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
      });
    }
    setPendingAttachments((prev) => safeArr(prev).filter((p) => p.id !== id));
  }, [pendingAttachments, setExtras, setModels]);

  const handleAttachAllPending = useCallback(() => {
    const ready = safeArr(pendingAttachments);
    if (!ready.length) return;

    const toExtras = ready.filter((r) => r.fileType === 'Extras');
    const toModels = ready.filter((r) => r.fileType === '3D Model');

    if (toExtras.length) {
      setExtras((current) => {
        const merged = [...safeArr(current), ...toExtras];
        return merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
      });
    }
    if (toModels.length) {
      setModels((current) => {
        const merged = [...safeArr(current), ...toModels];
        return merged.map((f, idx) => ({ ...f, slno: idx + 1 }));
      });
    }
    setPendingAttachments([]);
  }, [pendingAttachments, setExtras, setModels]);

  const handleDeleteAttachments = useCallback(() => {
    if (!selectedAttachmentRows.size) return;
    const updatedExtras = safeArr(extras).filter(item => !selectedAttachmentRows.has(item.id))
      .map((item, i) => ({ ...item, slno: i + 1 }));
    const updatedModels = safeArr(models).filter(item => !selectedAttachmentRows.has(item.id))
      .map((item, i) => ({ ...item, slno: i + 1 }));
    setExtras(updatedExtras);
    setModels(updatedModels);
    setSelectedAttachmentRows(new Set());
  }, [extras, models, selectedAttachmentRows, setExtras, setModels]);

  /* ====== Excel upload & parse – keep File[] so we can ZIP ====== */
  const handleExcelUpload = useCallback((e) => {
    // Enforce: client -> project -> package before uploading Excel
    if (selectedClientId == null) return alert("Please select a Client first.");
    if (!selectedProjectId) return alert("Please select a Project first.");
    if (!selectedPackageId) return alert("Please select a Package first.");
    if (!useDrawingStore.getState().projectNo)
      return alert("Please select a Project No. first.");

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Keep actual File objects to include in ZIP later
    setUploadedExcelFiles(prev => [...safeArr(prev), ...files]);

    const allParsed = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const headerIndex = data.findIndex((row) =>
          row.some((cell) => typeof cell === "string" && cell.toLowerCase().includes("dr no"))
        );
        if (headerIndex === -1) {
          alert(`Couldn't find header row in ${file.name}`);
          return;
        }

        const header = data[headerIndex].map((cell) =>
          typeof cell === "string" ? cell.trim().toLowerCase() : ""
        );

        const drgNoIndex = header.findIndex((col) => col.includes("dr no"));
        const itemIndex = header.findIndex((col) => col.includes("description"));
        const revIndex = header.findIndex((col) => col.includes("rev"));
        const statusIndex = header.findIndex((col) => col.includes("rev remarks"));
        const modelerIndex = header.findIndex((col) => col.includes("mod by"));
        const detailerIndex = header.findIndex((col) => col.includes("dr by"));
        const checkerIndex = header.findIndex((col) => col.includes("ch by"));
        const categoryIndex = header.findIndex((col) => col.includes("category"));

        const rows = data.slice(headerIndex + 1).filter((row) => row.length);

        const parsed = rows.map((row, i) => ({
          id: crypto.randomUUID(),
          slno: drawings.length + allParsed.length + i + 1,
          drgNo: row[drgNoIndex] || "-",
          item: row[itemIndex] || "-",
          rev: row[revIndex] !== undefined && row[revIndex] !== null && row[revIndex] !== "" ? String(row[revIndex]) : "-",
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

        allParsed.push(...parsed);
        setExcelFileData((prev) => [...prev, ...parsed]);
      };

      reader.readAsBinaryString(file);
    });
  }, [drawings.length, selectedClientId, selectedProjectId, selectedPackageId]);

  const attachExcelToTable = useCallback(() => {
    if (!useDrawingStore.getState().projectNo)
      return alert("Please select a Project No. first.");
    if (!excelFileData.length)
      return alert("Please upload an Excel file first.");

    const updated = [...safeArr(drawings), ...safeArr(excelFileData)].map((item, i) => ({
      ...item,
      slno: i + 1,
    }));
    setDrawings(updated);
    setExcelFileData([]);
    if (excelInputRef.current) excelInputRef.current.value = "";
  }, [excelFileData, drawings, setDrawings]);

  /* ====== Attach PDFs to drawing rows ====== */
  const extractDrgToken = (fileName, format) => {
    if (!fileName) return null;
    const base = fileName.replace(/\.pdf$/i, "");
    const untilParen = (str) => str.split("(")[0];
    try {
      switch (format) {
        case "Project-Drg-Revision": {
          const parts = base.split("-");
          return parts.length >= 2 ? normalizeToken(parts[1]) : null;
        }
        case "Drg-Revision": {
          const parts = base.split("-");
          return parts.length >= 1 ? normalizeToken(parts[0]) : null;
        }
        case "Drg": {
          return normalizeToken(base);
        }
        case "Project-Drg(Revision)": {
          const left = untilParen(base);
          const parts = left.split("-");
          return parts.length >= 2 ? normalizeToken(parts[1]) : null;
        }
        case "Project_Drg_Revision": {
          const parts = base.split("_");
          return parts.length >= 2 ? normalizeToken(parts[1]) : null;
        }
        case "Drg_Revision": {
          const parts = base.split("_");
          return parts.length >= 1 ? normalizeToken(parts[0]) : null;
        }
        case "Project_Drg(Revision)": {
          const left = untilParen(base);
          const parts = left.split("_");
          return parts.length >= 2 ? normalizeToken(parts[1]) : null;
        }
        case "%Drg%#Revision#": {
          if (base.includes("%")) {
            const first = base.indexOf("%");
            const second = base.indexOf("%", first + 1);
            if (first >= 0 && second > first) return normalizeToken(base.slice(first + 1, second));
          }
          const beforeHash = base.split("#")[0];
          return normalizeToken(beforeHash);
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  const handleAttachFiles = useCallback(() => {
    // Enforce: Excel (drawings) must be attached before attaching PDFs; also package must be selected
    if (selectedClientId == null) return alert("Please select a Client first.");
    if (!selectedProjectId) return alert("Please select a Project first.");
    if (!selectedPackageId) return alert("Please select a Package first.");
    if (!useDrawingStore.getState().projectNo) return alert("Please select a Project No. first.");
    if (!Array.isArray(drawings) || drawings.length === 0) return alert("Please upload and attach Excel first to load drawings.");
    if (!selectedFormat) return alert("Please select a Format before attaching files.");
    if (!pendingExtraFiles.length) return alert("Please upload PDF files before attaching.");

    let regex = null;
    if (selectedFormat !== "No Format") regex = formatRegexMap[selectedFormat];

  const matchedFiles = [];
  const entriesToLog = [];
    const unmatchedFiles = [];

    const updatedDrawings = drawings.map(row => ({ ...row, attachedPdfs: row.attachedPdfs ? [...row.attachedPdfs] : [] }));

    pendingExtraFiles.forEach(file => {
      const baseNoExt = file.name.replace(/\.pdf$/i, "");
      const normalizedBase = normalizeToken(baseNoExt);
      const matchesFormat = regex ? regex.test(file.name) : true;

      let targetRow = null;
      if (matchesFormat && selectedFormat && selectedFormat !== 'No Format') {
        const tokenRaw = extractDrgToken(file.name, selectedFormat);
        const token = stripFrTrSuffix(tokenRaw);
        if (token) targetRow = resolveRowForToken(token, file.name);
      }

      // Also support "token before first separator"
      if (!targetRow) {
        const leading = getLeadingToken(baseNoExt) || baseNoExt;
        const preToken = stripFrTrSuffix(normalizeToken(leading));
        if (preToken) targetRow = resolveRowForToken(preToken, file.name);
      }

      // Try exact normalized filename
      if (!targetRow) targetRow = resolveRowForToken(normalizedBase, file.name);

      // Best contained variant
      if (!targetRow) {
        const keys = Object.keys(drgNoMap);
        let best = '';
        for (const k of keys) {
          if (normalizedBase.includes(k) && k.length > best.length) best = k;
        }
        if (best) targetRow = resolveRowForToken(best, file.name);
      }

      if (targetRow) {
        const idx = updatedDrawings.findIndex(r => r.id === targetRow.id);
        if (idx >= 0) {
          const row = updatedDrawings[idx];
          row.attachedPdfs = [file]; // enforce single PDF per drawing: latest wins
          // Validate revision in filename vs Excel Rev cell
          try {
            const ok = checkRevisionMatch(row?.rev ?? '', file.name);
            if (!ok) {
              const fnRev = extractRevisionFromFileName(file.name);
              row.attachConflict = `Filename rev '${fnRev ?? '-'}' does not match Rev cell '${(row?.rev ?? '-')}'`;
            } else {
              row.attachConflict = '';
            }
          } catch {}
          matchedFiles.push(file);
          // Collect entry for immediate DB logging
          const dNo = row?.drgNo || row?.drawingNo || '';
          const cat = normalizeCategory(row?.category || '');
          const rev = row?.rev || null;
          entriesToLog.push({
            drawingNumber: dNo,
            category: cat,
            revision: rev,
            fileNames: [file.name],
            issueDate: new Date().toISOString().slice(0,10),
          });
        } else {
          unmatchedFiles.push(file.name);
        }
      } else {
        unmatchedFiles.push(file.name);
      }
    });

    if (matchedFiles.length === 0) {
      alert("No matching drawings found for attached PDF files.");
      return;
    }

    if (unmatchedFiles.length > 0) {
      alert(
        `Some files could not be matched with any DrgNo using the selected format:\n` +
        unmatchedFiles.map((f) => `- ${f}`).join("\n")
      );
    }

    setDrawings(updatedDrawings);
    setDrawingExtras(prev => [...safeArr(prev), ...matchedFiles]);
    setPendingExtraFiles([]);
    if (pdfDrawingsInputRef.current) pdfDrawingsInputRef.current.value = "";

    // Fire-and-forget logging to ProjectDrawing for matched files
    (async () => {
      try {
        const cid = selectedClientId != null && /^\d+$/.test(String(selectedClientId)) ? Number(selectedClientId) : null;
        const pid = selectedProjectId != null ? Number(selectedProjectId) : null;
        const pkg = selectedPackageId != null && /^\d+$/.test(String(selectedPackageId)) ? Number(selectedPackageId) : undefined;
        if (!cid || !pid || !entriesToLog.length) return;
        await fetch('/api/project-drawings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: cid,
            projectId: pid,
            packageId: pkg,
            entries: entriesToLog,
          })
        });
      } catch (e) {
        // Silent failure; UI already attached locally
        console.warn('ProjectDrawing quick log failed:', e?.message || e);
      }
    })();
  }, [selectedFormat, pendingExtraFiles, drawings, drgNoMap, setDrawings, selectedClientId, selectedProjectId, selectedPackageId]);

  /* ====== Modal ====== */
  const openModal = useCallback((row) => {
    if (!row.attachedPdfs || row.attachedPdfs.length === 0) {
      alert(`No PDF attached for drawing ${row.drgNo}`);
      return;
    }
    setModalDrawingId(row.id ?? null);
    setModalFiles(row.attachedPdfs);
    setSelectedModalFiles(new Set(row.attachedPdfs.map(f => f.name)));
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalFiles([]);
    setSelectedModalFiles(new Set());
  }, []);

  const handleModalCheckboxChange = useCallback((fileName) => {
    setSelectedModalFiles(prev => {
      const updated = new Set(prev);
      if (updated.has(fileName)) updated.delete(fileName);
      else updated.add(fileName);
      return updated;
    });
  }, []);

  const handleSelectAllModal = useCallback((e) => {
    if (e.target.checked) {
      setSelectedModalFiles(new Set(modalFiles.map((f) => f.name)));
    } else {
      setSelectedModalFiles(new Set());
    }
  }, [modalFiles]);

  const handleDownloadSelected = useCallback(() => {
    if (!selectedModalFiles.size) return alert("Please select files to download.");
    modalFiles.forEach((file) => {
      if (selectedModalFiles.has(file.name)) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }, [modalFiles, selectedModalFiles]);

  const handleRemoveModalFile = useCallback((fileName) => {
    setModalFiles(prev => prev.filter((f) => (f?.name || f?.file?.name) !== fileName));
    setDrawingExtras(prev => prev.filter((f) => (f?.name || f?.file?.name) !== fileName));
    setSelectedModalFiles(prev => {
      const updated = new Set(prev);
      updated.delete(fileName);
      return updated;
    });

    setDrawings(prev => prev.map(d => {
      if (!modalDrawingId || d.id !== modalDrawingId) return d;
      const nextAttached = (d.attachedPdfs || []).filter((f) => (f?.name || f?.file?.name) !== fileName);
      return { ...d, attachedPdfs: nextAttached };
    }));
  }, [modalDrawingId, setDrawings]);

  /* ====== Category mapping ====== */
  const mapCategoryToType = useCallback((cat) => {
    const c = String(cat || '').trim().toUpperCase();
    if (c === 'A') return 'Shop Drawing';
    if (c === 'G') return 'Erection Drawing';
    if (c === 'W') return 'Part Drawing';
    if (!c) return '-';
    return 'Other';
  }, []);

  /* ====== Approve ====== */
  const handleSubmit = useCallback(() => {
    const st = useDrawingStore.getState();
    if (!st.projectNo || !st.projectName) {
      alert("Please select a project first.");
      return;
    }
    // If nothing is explicitly selected, default to all items to keep UX flowing
    const selectedDrawings = selectedRows.size > 0
      ? drawings.filter((d) => selectedRows.has(d.id))
      : safeArr(drawings);
    const allAttachments = [...safeArr(extras), ...safeArr(models)];
    const selectedAttachments = selectedAttachmentRows.size > 0
      ? allAttachments.filter((a) => selectedAttachmentRows.has(a.id))
      : allAttachments;
    const selectedExtras = selectedAttachments.filter(a => a.fileType === 'Extras' || a.fileType === 'Extra');
    const selectedModels = selectedAttachments.filter(a => a.fileType === '3D Model');

    if (safeArr(selectedDrawings).length + safeArr(selectedExtras).length + safeArr(selectedModels).length === 0) {
      alert("No drawings or attachments available to approve.");
      return;
    }
    setProjectDetails(st.projectName, st.projectNo);
    setApprovedDrawings(selectedDrawings);
    setApprovedExtras(selectedExtras);
    setApprovedModels(selectedModels);
    router.push("/dashboard/project/project/publish_drawings/hybrid_publish_drawings");
  }, [drawings, extras, models, selectedRows, selectedAttachmentRows, setProjectDetails, setApprovedDrawings, setApprovedExtras, setApprovedModels, router]);

  /* ====== ZIP creation (Code #2 behavior) ======
     - Drawings -> Drawing/<Shop|Erection|Part|Other>/
     - Extras & 3D -> <EXT>/ at ZIP root (PDF, DWG, STEP, ...)
     - Excel -> Drawing/Excel/<EXT>/
  */
  const handleDownloadAllFiles = useCallback(async () => {
    // Guard: require at least one drawing PDF to be attached
    const hasAnyPdf = safeArr(drawings).some(d => Array.isArray(d.attachedPdfs) && d.attachedPdfs.length > 0);
    if (!hasAnyPdf) {
      alert('Please attach at least one PDF drawing before downloading.');
      return;
    }
    const zip = new JSZip();
    const rootFolder = zip.folder("Drawing");

    const getCategoryFolder = (cat) => {
      const c = String(cat || '').trim();
      if (c === "A") return "Shop Drawings";
      if (c === "G") return "Erection Drawings";
      if (c === "W") return "Part Drawings";
      return "Other Drawings";
    };

    // 1) Drawings into category subfolders
    safeArr(drawings).forEach(d => {
      if (d.attachedPdfs && d.attachedPdfs.length) {
        const folderName = getCategoryFolder(d.category?.toString().trim());
        const subFolder = rootFolder && rootFolder.folder(folderName);
        d.attachedPdfs.forEach(file => {
          const f = file?.file || file;
          if (f instanceof File) {
            subFolder && subFolder.file(f.name, f);
          }
        });
      }
    });

    // 2) Extras & 3D at ZIP root grouped by extension
    const addToZipByExtensionAtRoot = (filesArray) => {
      const list = safeArr(filesArray);
      if (!list.length) return;
      list.forEach((entry) => {
        const f = entry?.file || (entry instanceof File ? entry : null);
        if (!f) return;
        const ext = (f.name.split('.').pop() || "UNKNOWN").toUpperCase();
        const extFolder = zip.folder(ext);
        extFolder && extFolder.file(f.name, f);
      });
    };
    addToZipByExtensionAtRoot(extras);
    addToZipByExtensionAtRoot(models);

    // 3) Excel files inside Drawing/Excel/<EXT>/
    if (uploadedExcelFiles && uploadedExcelFiles.length) {
      const excelBase = rootFolder && rootFolder.folder("Excel");
      uploadedExcelFiles.forEach((f) => {
        if (!f) return;
        const ext = (f.name.split('.').pop() || "UNKNOWN").toUpperCase(); // XLS / XLSX
        const excelExtFolder = excelBase && excelBase.folder(ext);
        (excelExtFolder || excelBase || rootFolder || zip).file(f.name, f);
      });
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Drawing.zip");
    alert("Download completed!");
  }, [drawings, extras, models, uploadedExcelFiles]);

  /* ====== Table renderers (same UX as Code #1) ====== */
  const renderTable = useCallback((files = [], isDrawing = false, selection = null, onCheck = null) => {
    const normalized = Array.isArray(files)
      ? files
      : (files && typeof files[Symbol.iterator] === 'function' ? Array.from(files) : []);

    if (normalized.length === 0) {
      // For attachment tables with selection capability, show empty table structure
      if (!isDrawing && selection && onCheck) {
        // Show empty table with headers for attachments
        return (
          <div className="overflow-auto max-h-64 mt-2 border rounded-lg">
            <table className="min-w-full table-fixed border-collapse rounded-sm overflow-hidden">
              <thead>
                <tr className="bg-cyan-800 text-white text-sm">
                  <th className="border px-2 py-1 rounded-tl-lg">S.No.</th>
                  <th className="border px-2 py-1">
                    <input
                      type="checkbox"
                      disabled
                      checked={false}
                    />{" "}
                    Select All
                  </th>
                  <th className="border px-2 py-1">File Name</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Size</th>
                  <th className="border px-2 py-1">Upload Date</th>
                  <th className="border px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="7" className="text-center text-red-600 font-semibold py-4">
                    No files uploaded
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      }
      
      // Default empty state for other cases
      return (
        <div className="text-center text-red-600 font-semibold py-2">
          {isDrawing ? 'No Drawings Are Available' : 'No files uploaded'}
        </div>
      );
    }

    const isParsed = isDrawing && normalized[0] && "drgNo" in normalized[0];

    // For drawings, show conflicts first then missing attachments
    const viewFiles = (() => {
      if (!isDrawing) return normalized;
      const withIndex = normalized.map((f, i) => ({ f, i }));
      withIndex.sort((a, b) => {
        const aConflict = revisionConflicts.has(a.f?.id);
        const bConflict = revisionConflicts.has(b.f?.id);
        if (aConflict !== bConflict) return aConflict ? -1 : 1;

        const aHasAttachment = Array.isArray(a.f?.attachedPdfs) && a.f.attachedPdfs.length > 0;
        const bHasAttachment = Array.isArray(b.f?.attachedPdfs) && b.f.attachedPdfs.length > 0;
        if (aHasAttachment !== bHasAttachment) return aHasAttachment ? 1 : -1;

        return a.i - b.i;
      });
      return withIndex.map(({ f }) => f);
    })();

    return (
      <div className="overflow-auto max-h-64 mt-2 border rounded-lg">
        <table className="min-w-full table-fixed border-collapse rounded-sm overflow-hidden">
          <thead>
            <tr className="bg-cyan-800 text-white text-sm">
              <th className="border px-2 py-1 rounded-tl-lg">S.No.</th>
              {(isDrawing && isParsed) || (!isDrawing && selection && onCheck) ? (
                <th className="border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(selection instanceof Set) && selection.size === viewFiles.length && viewFiles.length > 0}
                    onChange={(e) =>
                      onCheck?.(e.target.checked ? new Set(viewFiles.map((f) => f.id)) : new Set())
                    }
                  />{" "}
                  Select All
                </th>
              ) : null}
              {isDrawing ? (
                <>
                  <th className="border px-2 py-1">DrgNo.</th>
                  <th className="border px-2 py-1">Item</th>
                  <th className="border px-2 py-1">Rev</th>
                  <th className="border px-2 py-1">Prev Rev</th>
                  <th className="border px-2 py-1">Modeler</th>
                  <th className="border px-2 py-1">Detailer</th>
                  <th className="border px-2 py-1">Checker</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Attached</th>
                  <th className="border px-2 py-1">View</th>
                  <th className="border px-2 py-1">Drg Conflict</th>
                  <th className="border px-2 py-1">Attach Conflict</th>
                </>
              ) : (
                <>
                  <th className="border px-2 py-1">File Name</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Size</th>
                  <th className="border px-2 py-1">Upload Date</th>
                  <th className="border px-2 py-1">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {viewFiles.map((file, index) => {
              const hasRevisionConflict = isDrawing && revisionConflicts.has(file?.id);
              const hasAttachConflict = isDrawing && !!String(file?.attachConflict || '').trim();
              const revMessage = isDrawing ? (revisionConflicts.get(file?.id) || '') : '';
              // Resolve prev revision: prefer filename-based match; fallback to drawing+category
              let prevRev = '';
              const firstPdfName = (Array.isArray(file?.attachedPdfs) && file.attachedPdfs.length > 0) ? (file.attachedPdfs[0]?.name) : null;
              if (firstPdfName) {
                const fnameKey = `file::${String(firstPdfName).trim().toLowerCase()}`;
                prevRev = prevRevMap[fnameKey] ?? '';
              }
              if (!prevRev) {
                const dr = isDrawing ? (file?.drgNo ?? file?.drawingNo ?? '-') : '-';
                const catKeyRaw = file?.category ?? '';
                const { normDr, normCat } = normalizeDrawingKey(dr, catKeyRaw);
                prevRev = prevRevMap[`${normDr}::${normCat}`] ?? prevRevMap[normDr] ?? '';
              }

              return (
                <tr
                  key={file.id || `${file.name}-${index}`}
                  className={`text-center text-sm ${hasAttachConflict ? 'bg-red-100' : (hasRevisionConflict ? 'bg-yellow-100' : '')}`}
                >
                  <td className="border px-2 py-1">{isDrawing ? (index + 1) : (file.slno || index + 1)}</td>
                  {((isDrawing && isParsed) || (!isDrawing && selection && onCheck)) && (
                    <td className="border px-2 py-1">
                      <input
                        type="checkbox"
                        checked={(selection instanceof Set) && selection.has(file.id)}
                        onChange={() => {
                          const updated = selection instanceof Set ? new Set(selection) : new Set();
                          if (updated.has(file.id)) updated.delete(file.id);
                          else updated.add(file.id);
                          onCheck?.(updated);
                        }}
                      />
                    </td>
                  )}
                  {isDrawing ? (
                    <>
                      <td className="border px-2 py-1">{isParsed ? file.drgNo : file.name}</td>
                      <td className="border px-2 py-1">{file.item || "-"}</td>
                      <td className="border px-2 py-1">{file.rev === "0" ? "0" : (file.rev || "-")}</td>
                      <td className="border px-2 py-1">{prevRev || (prevRevLoading ? '...' : 'NA')}</td>
                      <td className="border px-2 py-1">{file.modeler || "-"}</td>
                      <td className="border px-2 py-1">{file.detailer || "-"}</td>
                      <td className="border px-2 py-1">{file.checker || "-"}</td>
                      <td className="border px-2 py-1">{file.status || "-"}</td>
                      <td className="border px-2 py-1">{mapCategoryToType(file.category)}</td>
                      <td className="border px-2 py-1">
                        {Array.isArray(file.attachedPdfs) && file.attachedPdfs.length > 0 ? (
                          <span className="text-green-600 font-semibold" title="Files attached">✓</span>
                        ) : (
                          <span className="text-red-600 font-semibold" title="No files attached">✗</span>
                        )}
                      </td>
                      <td
                        className="border px-2 py-1 text-blue-600 font-semibold cursor-pointer"
                        onClick={() => openModal(file)}
                      >
                        View
                      </td>
                      <td className="border px-2 py-1">
                        {hasRevisionConflict ? (
                          <span className="text-red-600 text-xs font-semibold" title={revMessage}>
                            {revMessage}
                          </span>
                        ) : null}
                      </td>
                      <td className="border px-2 py-1">
                        <textarea
                          className="w-full text-xs resize-none"
                          value={file.attachConflict || ""}
                          onChange={(e) => {
                            setDrawings(drawings.map(d =>
                              d.id === file.id ? { ...d, attachConflict: e.target.value } : d
                            ));
                          }}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border px-2 py-1">{file.name || 'Unknown File'}</td>
                      <td className="border px-2 py-1">{file.fileType || 'Extra'}</td>
                      <td className="border px-2 py-1">
                        {file.size && typeof file.size === 'number' ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                      </td>
                      <td className="border px-2 py-1">
                        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="border px-2 py-1">
                        {file.error ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800" title={file.error}>
                            Failed
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            Attached
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [openModal, drawings, setDrawings, prevRevMap, prevRevLoading, revisionConflicts]);

  const handleDeleteSelected = useCallback(() => {
    const updated = drawings
      .filter(item => !selectedRows.has(item.id))
      .map((item, i) => ({ ...item, slno: i + 1 }));
    setDrawings(updated);
    setSelectedRows(new Set());
  }, [drawings, selectedRows, setDrawings]);

  /* ================== Render ================== */

  return (
    <div className="p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <label className="font-semibold">Client</label>
        <select
          value={selectedClientId != null ? String(selectedClientId) : ''}
          onChange={(e) => {
            const raw = e.target.value;
            const localId = raw || null; // hold as string for robust equality checks
            setSelectedClientId(localId);
            // Update store using numeric when applicable
            const storeId = localId != null && /^\d+$/.test(localId) ? Number(localId) : null;
            setStoreSelectedClientId(storeId);
            // Reset dependent selections
            setLocalSelectedProjectId(null);
            setSelectedProjectId(null);
            setSelectedPackageId('');
            setSelectedPackage(null);
            // Filter projects using string-safe equality across possible fields
            if (localId != null && localId !== '') {
              const filtered = (baseProjects || []).filter(p => {
                const pid = String(p?.clientId ?? '');
                const pcid = String(p?.client?.id ?? '');
                const owner = String(p?.ownerId ?? '');
                return pid === localId || pcid === localId || owner === localId;
              });
              setProjects(filtered);
            } else {
              setProjects(baseProjects || []);
            }
          }}
          className="border rounded-md px-2 py-1 text-sm"
          disabled={loadingClients}
        >
          <option value="">{loadingClients ? 'Loading Clients...' : 'Select Client'}</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name || c.clientName || c.id}</option>
          ))}
        </select>

        <label className="font-semibold">Project No.</label>
        <select
          value={projectNo}
          onChange={handleProjectChange}
          className="border rounded-md px-2 py-1 text-sm"
          disabled={loadingProjects || !canSelectProject}
          title={!canSelectProject ? 'Select Client first' : undefined}
        >
          <option value="">{loadingProjects ? 'Loading...' : 'Select'}</option>
          {projects.map((proj) => (
            <option key={proj.id || proj.projectNo} value={proj.projectNo || proj.id}>
              {proj.projectNo || proj.id} - {proj.name || proj.projectName}
            </option>
          ))}
        </select>

        {/* Package selector */}
        <label className="font-semibold">Package</label>
        <select
          value={selectedPackageId}
          onChange={(e) => {
            const pid = e.target.value;
            setSelectedPackageId(pid);
            const pkg = (packages || []).find(p => String(p.id) === String(pid));
            setSelectedPackage(pkg || null);
          }}
          className="border rounded-md px-2 py-1 text-sm"
          disabled={!canSelectPackage || (packages || []).length === 0}
          title={!canSelectPackage ? 'Select Project first' : undefined}
        >
          <option value="">{!selectedProjectId ? 'Select project first' : ((packages || []).length ? 'Select package' : 'No packages')}</option>
          {(packages || []).map(p => (
            <option key={p.id} value={p.id}>{p.name || p.packageNumber || `Package ${p.id}`}</option>
          ))}
        </select>

        {/* Previous submissions button */}
        <button
          type="button"
          className="ml-2 px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedProjectId || !selectedPackageId}
          onClick={async () => {
            if (!selectedProjectId || !selectedPackageId) return;
            setPrevOpen(true);
            setPrevLoading(true);
            setPrevError('');
            setPrevRows([]);
            try {
              const url = `/api/project-drawings?projectId=${Number(selectedProjectId)}&packageId=${Number(selectedPackageId)}`;
              const r = await fetch(url);
              if (!r.ok) {
                const t = await r.text().catch(() => '');
                throw new Error(t || `Request failed (${r.status})`);
              }
              const data = await r.json();
              setPrevRows(Array.isArray(data) ? data : []);
            } catch (err) {
              setPrevError(err?.message || 'Failed to load previous submissions');
            } finally {
              setPrevLoading(false);
            }
          }}
          title="Show previous submissions for this package"
        >
          Previous
        </button>

        <label className="font-semibold">Project Name</label>
        <input
          type="text"
          value={projectName}
          readOnly
          className="border rounded-md px-2 py-1 bg-gray-100 text-sm w-60"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border rounded-sm rounded-b-none bg-gray-100">
        {["Drawings", "Attachments"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm border-r ${activeTab === tab ? "bg-white font-semibold" : ""}`}
          >
            {tab} ({tab === "Drawings" ? drawings.length : (safeArr(extras).length + safeArr(models).length)})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white p-4 border">
        {activeTab === "Drawings" && (
          <>
            <div className="space-y-4">
              {/* Excel Upload Box */}
              <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  Upload Excel (.xls, .xlsx)
                  <InfoPopover title="Excel upload rules">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Accepted: .xls, .xlsx (first sheet is read)</li>
                      <li>Headers required: Dr No, Description, Rev, Rev Remarks, Mod By, Dr By, Ch By, Category</li>
                      <li>Duplicate DrgNo entries are supported; Category decides the Type</li>
                      <li>After upload, click “Attach .xls File” to add rows to the table</li>
                    </ul>
                  </InfoPopover>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="file"
                    multiple
                    accept=".xls,.xlsx"
                    onChange={handleExcelUpload}
                    ref={excelInputRef}
                    className="file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-700 file:text-white hover:file:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canUploadExcel}
                    title={!canUploadExcel ? 'Select Client → Project → Package before uploading Excel' : undefined}
                  />
                  <button onClick={attachExcelToTable} className="bg-teal-800 text-white px-4 py-1.5 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canUploadExcel || !excelFileData.length} title={!canUploadExcel ? 'Complete previous steps first' : (!excelFileData.length ? 'Upload Excel first' : undefined)}>
                    Attach .xls File
                  </button>
                </div>
              </div>

              {/* PDF Attach Box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  Attach PDF Drawings
                  <InfoPopover title="PDF attachment rules">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Accepted: .pdf</li>
                      <li>Select a naming format; files must match it unless you choose “No Format”</li>
                      <li>Matching uses the drawing token (before first symbol like '-', ' ', '_', '['). Suffix FR/TR is ignored.</li>
                      <li>If same DrgNo appears in multiple categories, the filename hints (main part/part/GA/erection) decide target row.</li>
                      <li>Each drawing holds one PDF; the latest match replaces the previous.</li>
                    </ul>
                  </InfoPopover>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    ref={pdfDrawingsInputRef}
                    onChange={(e) => {
                      if (!canAttachPDF) {
                        alert("Please complete steps: Select Client → Project → Package and attach Excel to load drawings.");
                        if (e?.target) e.target.value = "";
                        return;
                      }
                      const files = Array.from(e.target.files || []);
                      setPendingExtraFiles(files);
                    }}
                    className="file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canAttachPDF}
                    title={!canAttachPDF ? 'Upload and attach Excel first to load drawings' : undefined}
                  />
                  <button
                    className="bg-teal-800 text-white px-4 py-1.5 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canAttachPDF}
                    onClick={handleAttachFiles}
                  >
                    Attach Files
                  </button>
                  <select
                    value={selectedFormat}
                    onChange={(e) => {
                      const format = e.target.value;
                      setSelectedFormat(format);
                      if (!pendingExtraFiles.length || format === "No Format") return;
                      const regex = formatRegexMap[format];
                      const invalid = pendingExtraFiles.filter((f) => !regex.test(f.name));
                      if (invalid.length > 0) {
                        alert(
                          `The following files do not match the selected format (${format}):\n` +
                          invalid.map((f) => `- ${f.name}`).join("\n")
                        );
                      }
                    }}
                    className="border px-2 py-1.5 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canAttachPDF}
                    title={!canAttachPDF ? 'Complete previous steps first' : undefined}
                  >
                    <option value="">Select Format</option>
                    <option value="No Format">No Format</option>
                    {formatOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-blue-900/70 mt-2">Select the format that matches your file naming.</p>
              </div>
            </div>

            {/* Attached summary */}
            <div className="mt-3 mb-2 text-sm">
              <span className="font-semibold">Attached:</span>
              <span className="ml-1">{attachmentStats.attached} / {attachmentStats.total}</span>
              <span className={`ml-3 ${attachmentStats.missing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                (Missing: {attachmentStats.missing})
              </span>
            </div>

            {/* Previous submissions modal only; inline section removed */}

            {renderTable(drawings, true, selectedRows, setSelectedRows)}
            {selectedRows.size > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-6 py-2 text-sm rounded">
                  Delete Selected
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "Attachments" && (
          <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm mb-2">
              <div className="text-sm font-semibold text-amber-900 mb-2">Upload Attachments (Extra & 3D Model)</div>
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-700">Extra:</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, "Extras")}
                    ref={extrasUploadRef}
                    className="file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-700 file:text-white hover:file:bg-amber-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-700">3D Model:</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, "3D Model")}
                    ref={modelInputRef}
                    className="file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-fuchsia-700 file:text-white hover:file:bg-fuchsia-800"
                  />
                </div>
              </div>


            </div>

            {renderTable([...(safeArr(extras)), ...(safeArr(models))], false, selectedAttachmentRows, setSelectedAttachmentRows)}
            {selectedAttachmentRows.size > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleDeleteAttachments} className="bg-red-600 text-white px-6 py-2 text-sm rounded">
                  Delete Selected
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Left Buttons */}
      <div className="mt-4 flex justify-start">
        <button
          onClick={handleDownloadAllFiles}
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={attachmentStats.attached === 0}
          title={attachmentStats.attached === 0 ? 'Attach at least one PDF drawing first' : undefined}
        >
          Download Drawing
        </button>
        <button
          onClick={handleSubmit}
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm"
        >
          Approve
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[600px] p-4 shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <table className="w-full border">
              <thead>
                <tr className="bg-cyan-800 text-white text-sm">
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedModalFiles.size === modalFiles.length}
                      onChange={handleSelectAllModal}
                    />
                    <span className="ml-2 font-semibold">Select All</span>
                  </th>
                  <th className="p-2 text-left font-semibold">Name</th>
                  <th className="p-2 text-left font-semibold">Description</th>
                  <th className="p-2 text-left font-semibold">Remove</th>
                </tr>
              </thead>
              <tbody>
                {modalFiles.map((file, idx) => (
                  <tr key={idx} className="border-t text-sm">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedModalFiles.has(file.name)}
                        onChange={() => handleModalCheckboxChange(file.name)}
                      />
                    </td>
                    <td className="p-2">{file.name}</td>
                    <td className="p-2">
                      <textarea className="border w-full px-1 py-1 text-xs" value={file.name} readOnly />
                    </td>
                    <td
                      className="p-2 text-blue-600 cursor-pointer"
                      onClick={() => handleRemoveModalFile(file.name)}
                    >
                      Remove
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={handleDownloadSelected}
                className="bg-blue-700 text-white px-4 py-1 text-sm rounded"
              >
                Download
              </button>
              <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-1 text-sm rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previous submissions Modal */}
      {prevOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[720px] p-4 shadow-lg relative">
            <button
              onClick={() => setPrevOpen(false)}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <div className="mb-3">
              <div className="text-sm font-semibold">Previous submissions for package {String(selectedPackageId || '')}</div>
              {prevLoading && <div className="text-xs text-gray-600 mt-1">Loading...</div>}
              {prevError && <div className="text-xs text-red-600 mt-1">{prevError}</div>}
            </div>
            <div className="max-h-[60vh] overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cyan-800 text-white">
                    <th className="text-left px-2 py-1">#</th>
                    <th className="text-left px-2 py-1">Drawing No</th>
                    <th className="text-left px-2 py-1">Revision</th>
                    <th className="text-left px-2 py-1">Category</th>
                    <th className="text-left px-2 py-1">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {!prevLoading && (!prevRows || prevRows.length === 0) && (
                    <tr>
                      <td colSpan="5" className="text-center text-red-600 py-3">No previous submissions found</td>
                    </tr>
                  )}
                  {Array.isArray(prevRows) && prevRows.map((row, idx) => {
                    const dr = row?.drawingNumber ?? row?.drgNo ?? row?.drg_no ?? '-';
                    const rev = row?.revision ?? row?.rev ?? '-';
                    const cat = row?.category ?? row?.Category ?? '';
                    const upd = row?.updatedAt || row?.updated_at || row?.lastAttachedAt || row?.lastattachedat || null;
                    const updStr = upd ? new Date(upd).toLocaleString() : '-';
                    return (
                      <tr key={row.id || idx} className="odd:bg-gray-50">
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">{String(dr)}</td>
                        <td className="px-2 py-1">{String(rev)}</td>
                        <td className="px-2 py-1">{String(cat)}</td>
                        <td className="px-2 py-1">{updStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setPrevOpen(false)} className="bg-gray-500 text-white px-3 py-1 text-sm rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishDrawing;
