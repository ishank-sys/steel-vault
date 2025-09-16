'use client';

import React, { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import useDrawingStore from '../../../stores/useDrawingStore';
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const dummyProjects = {
  P001: "Metro Project",
  P002: "Airport Terminal",
  P003: "Mall Expansion",
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
  "Project-Drg(Revision)": /^[\w\d]+-[\w\d]+KATEX_INLINE_OPEN[\w\d]+KATEX_INLINE_CLOSE\.pdf$/i,
  "Project_Drg_Revision": /^[\w\d]+_[\w\d]+_[\w\d]+\.pdf$/i,
  "Drg_Revision": /^[\w\d]+_[\w\d]+\.pdf$/i,
  "Project_Drg(Revision)": /^[\w\d]+_[\w\d]+KATEX_INLINE_OPEN[\w\d]+KATEX_INLINE_CLOSE\.pdf$/i,
  "%Drg%#Revision#": /^.+#.+#\.pdf$/i,
};

const uploadFileToS3 = async (file, { projectId = null, clientId = null } = {}) => {
  // 1) Request signed upload URL from the server
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

  // 2) PUT directly to GCS using the signed URL
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

  // 3) Notify server to log upload metadata
  const logRes = await fetch('/api/upload-log', {
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
  const logJson = await logRes.json().catch(() => ({}));

  return { destinationPath, record: logJson?.record };
};

const PublishDrawing = () => {
  const router = useRouter();
  const {
    setProjectDetails,
    setApprovedDrawings,
    setDrawings,
    setExtras,
    setModels,
    drawings,
    extras,
    models,
    projectNo,
    projectName,
  } = useDrawingStore();

  // Local state for UI only
  const [uploadedExcelFile, setUploadedExcelFile] = useState(null);
  const [activeTab, setActiveTab] = useState("Drawings");
  const [excelFileData, setExcelFileData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedExtrasRows, setSelectedExtrasRows] = useState(new Set());
  const [selectedModelRows, setSelectedModelRows] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [selectedModalFiles, setSelectedModalFiles] = useState(new Set());
  const [drawingExtras, setDrawingExtras] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [pendingExtraFiles, setPendingExtraFiles] = useState([]);

  const excelInputRef = useRef(null);
  const extrasInputRef = useRef(null);
  const modelInputRef = useRef(null);

  // Memoized drgNo variants map for fast matching
  const drgNoMap = useMemo(() => {
    const map = {};
    drawings.forEach(row => {
      if (!row.drgNo) return;
      const variants = [
        row.drgNo,
        row.drgNo.replace(/[^\w\d]/g, ""),
        row.drgNo.replace(/[\s_-]/g, "")
      ];
      variants.forEach(variant => {
        map[variant] = row;
      });
    });
    return map;
  }, [drawings]);

  const handleProjectChange = useCallback((e) => {
    const selected = e.target.value;
    const selectedProject = projects.find(p => p.projectNo === selected || p.id === selected);
    useDrawingStore.setState({
      projectNo: selectedProject ? selectedProject.projectNo || selectedProject.id : selected,
      projectName: selectedProject ? (selectedProject.name || selectedProject.projectName || '') : '',
    });
  }, [projects]);

  const handleFileChange = useCallback((e, type) => {
    if (!useDrawingStore.getState().projectNo) return alert("Please select a Project No. first.");
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      file,
    }));

    if (type === "Extras") {
      setExtras([...extras, ...newFiles]);
    } else if (type === "3D Model") {
      setModels([...models, ...newFiles]);
    }
  }, [extras, models, setExtras, setModels]);

  const handleDeleteExtras = useCallback(() => {
    const updated = extras.filter(item => !selectedExtrasRows.has(item.id));
    setExtras(updated);
    setSelectedExtrasRows(new Set());
  }, [extras, selectedExtrasRows, setExtras]);

  const handleDeleteModels = useCallback(() => {
    const updated = models.filter(item => !selectedModelRows.has(item.id));
    setModels(updated);
    setSelectedModelRows(new Set());
  }, [models, selectedModelRows, setModels]);


  const handleExcelUpload = useCallback((e) => {
  if (!useDrawingStore.getState().projectNo)
    return alert("Please select a Project No. first.");

  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  setUploadedExcelFile(files); 
  const allParsed = [];

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const headerIndex = data.findIndex((row) =>
        row.some(
          (cell) => typeof cell === "string" && cell.toLowerCase().includes("dr no")
        )
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
        rev: row[revIndex] || "-",
        modeler: row[modelerIndex] || "-",
        detailer: row[detailerIndex] || "-",
        checker: row[checkerIndex] || "-",
        status: row[statusIndex] || "-",
        category: row[categoryIndex] || "",
        view: "View",
        conflict: "--- No approval sent before",
        attachConflict: "",
      }));

      allParsed.push(...parsed);
      setExcelFileData((prev) => [...prev, ...parsed]);
    };

    reader.readAsBinaryString(file);
  });
}, [drawings.length]);

  
  const attachExcelToTable = useCallback(() => {
  if (!useDrawingStore.getState().projectNo)
    return alert("Please select a Project No. first.");
  if (!excelFileData.length)
    return alert("Please upload an Excel file first.");

  const updated = [...drawings, ...excelFileData].map((item, i) => ({
    ...item,
    slno: i + 1,
  }));
  setDrawings(updated);
  setExcelFileData([]);
  if (excelInputRef.current) excelInputRef.current.value = null;
}, [excelFileData, drawings, setDrawings]);

  // fetch user and projects; make fetch resilient to failures to avoid console errors
  React.useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoadingProjects(true);
      setLoadingClients(true);
      try {
        const results = await Promise.allSettled([
          fetch('/api/users/me'),
          fetch('/api/projects'),
          fetch('/api/clients'),
        ]);

        const ures = results[0];
        const pres = results[1];
        const cres = results[2];

        let udata = null;
        if (ures.status === 'fulfilled' && ures.value && ures.value.ok) {
          try { udata = await ures.value.json(); } catch (e) { udata = null; }
        } else {
          console.warn('Could not fetch current user for project filtering');
        }

        let plist = [];
        if (pres.status === 'fulfilled' && pres.value && pres.value.ok) {
          try { plist = await pres.value.json(); } catch (e) { plist = []; }
        } else {
          console.warn('Could not fetch projects list');
        }

        let clist = [];
        if (cres.status === 'fulfilled' && cres.value && cres.value.ok) {
          try { clist = await cres.value.json(); } catch (e) { clist = []; }
        } else {
          console.warn('Could not fetch clients list');
        }

        // store unfiltered projects
        if (mounted) setAllProjects(plist || []);

        if (udata && udata.userType && String(udata.userType).toLowerCase() !== 'admin') {
          const clientId = udata.clientId || udata.client?.id || udata.id;
          plist = (plist || []).filter(p => {
            return p.clientId === clientId || (p.client && p.client.id === clientId) || p.ownerId === clientId;
          });
          // preselect client for non-admin users
          if (mounted) setSelectedClientId(clientId);
        }

        if (mounted) setClients(clist || []);
        if (mounted) setUser(udata);

        // Only filter by selectedClientId for non-admin users
        if (selectedClientId && udata && udata.userType && String(udata.userType).toLowerCase() !== 'admin') {
          plist = (plist || []).filter(p => p.clientId === selectedClientId || (p.client && p.client.id === selectedClientId) || p.ownerId === selectedClientId);
        }

        if (mounted) setProjects(plist || []);
      } catch (e) {
        console.warn('Failed to fetch user or projects', e);
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
        if (mounted) setLoadingClients(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  // Re-filter projects when selectedClientId changes
  React.useEffect(() => {
    if (!selectedClientId) {
      // restore full list
      setProjects(allProjects || []);
      return;
    }
    const filtered = (allProjects || []).filter(p => p.clientId === selectedClientId || (p.client && p.client.id === selectedClientId) || p.ownerId === selectedClientId);
    setProjects(filtered);
  }, [selectedClientId, allProjects]);
  
  const handleDeleteSelected = useCallback(() => {
    const updated = drawings.filter(item => !selectedRows.has(item.id)).map((item, i) => ({ ...item, slno: i + 1 }));
    setDrawings(updated);
    setSelectedRows(new Set());
  }, [drawings, selectedRows, setDrawings]);

  const openModal = useCallback((row) => {
    if (!row.attachedPdfs || row.attachedPdfs.length === 0) {
      alert(`No PDF attached for drawing ${row.drgNo}`);
      return;
    }
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

  const handleDownloadAllFiles = useCallback(async () => {
    const zip = new JSZip();
    const rootFolder = zip.folder("Drawing");

    const getCategoryFolder = (cat) => {
      if (cat === "A") return "Shop Drawings";
      if (cat === "G") return "Erection Drawings";
      if (cat === "W") return "Part Drawings";
      return "Other Drawings";
    };

    drawings.forEach(d => {
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
      if (!filesArray.length) return;
      filesArray.forEach((file) => {
        if (!file?.file && !(file instanceof File)) return;
        const actualFile = file?.file || file;
        const ext = actualFile.name.split('.').pop()?.toUpperCase() || "UNKNOWN";
        const extFolder = zip.folder(ext);
        extFolder.file(actualFile.name, actualFile);
      });
    };
    addToZipByExtension(extras);
    addToZipByExtension(models);

    if (uploadedExcelFile) {
      zip.file(uploadedExcelFile.name, uploadedExcelFile);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "Drawing.zip");
    alert("Download completed!");
  }, [drawings, extras, models, uploadedExcelFile]);

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
    setModalFiles(prev => prev.filter((f) => f.name !== fileName));
    setDrawingExtras(prev => prev.filter((f) => f.name !== fileName));
    setSelectedModalFiles(prev => {
      const updated = new Set(prev);
      updated.delete(fileName);
      return updated;
    });
  }, []);

  // Attach Files Handler
  const handleAttachFiles = useCallback(() => {
    if (!useDrawingStore.getState().projectNo) return alert("Please select a Project No. first.");
    if (!selectedFormat) return alert("Please select a Format before attaching files.");
    if (!pendingExtraFiles.length) return alert("Please upload PDF files before attaching.");

    const regex = formatRegexMap[selectedFormat];
    const matchedFiles = [];
    const unmatchedFiles = [];

    const updatedDrawings = drawings.map(row => ({ ...row, attachedPdfs: row.attachedPdfs ? [...row.attachedPdfs] : [] }));

    pendingExtraFiles.forEach(file => {
      const fileNameWithoutExt = file.name.replace(/\.pdf$/i, "");
      const matchesFormat = regex.test(file.name);

      let matchedRow = null;
      if (matchesFormat) {
        matchedRow = Object.keys(drgNoMap).find(variant => fileNameWithoutExt.includes(variant));
      }

      if (matchedRow) {
        const row = updatedDrawings.find(r => {
          const variants = [
            r.drgNo,
            r.drgNo.replace(/[^\w\d]/g, ""),
            r.drgNo.replace(/[\s_-]/g, "")
          ];
          return variants.includes(matchedRow);
        });
        if (row) {
          if (!row.attachedPdfs.some(f => f.name === file.name)) {
            row.attachedPdfs.push(file);
            matchedFiles.push(file);
          }
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
    setDrawingExtras(prev => [...prev, ...matchedFiles]);
    setPendingExtraFiles([]);
    if (extrasInputRef.current) extrasInputRef.current.value = null;
  }, [selectedFormat, pendingExtraFiles, drawings, drgNoMap, setDrawings]);

  // Approve handler
  const handleSubmit = useCallback(() => {
    if (!useDrawingStore.getState().projectNo || !useDrawingStore.getState().projectName) {
      alert("Please select a project first.");
      return;
    }
    if (!drawings.length) {
      alert("Please upload drawings first.");
      return;
    }
    const selectedDrawings = drawings.filter((d) => selectedRows.has(d.id));
    if (selectedDrawings.length === 0) {
      alert("Please select at least one drawing to approve.");
      return;
    }
    setProjectDetails(useDrawingStore.getState().projectName, useDrawingStore.getState().projectNo);
    setApprovedDrawings(selectedDrawings);
    router.push("/dashboard/project/project/publish_drawings/hybrid_publish_drawings");
  }, [drawings, selectedRows, setProjectDetails, setApprovedDrawings, router]);

  // Table rendering memoized for performance
  const renderTable = useCallback((files, isDrawing = false, selection = null, onCheck = null) => {
    if (!files.length) {
      return <div className="text-center text-red-600 font-semibold py-2">No Drawings Are Available</div>;
    }
    const isParsed = isDrawing && files[0] && "drgNo" in files[0];
    return (
      <div className="overflow-auto max-h-64 mt-2 border rounded-lg">
        <table className="min-w-full table-fixed border-collapse rounded-sm overflow-hidden">
          <thead>
            <tr className="bg-cyan-800 text-white text-sm">
              <th className="border px-2 py-1 rounded-tl-lg">S.No.</th>
              {(isDrawing && isParsed) || (!isDrawing && selection) ? (
                <th className="border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selection?.size === files.length && files.length > 0}
                    onChange={(e) =>
                      onCheck?.(e.target.checked ? new Set(files.map((f) => f.id)) : new Set())
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
                  <th className="border px-2 py-1">Modeler</th>
                  <th className="border px-2 py-1">Detailer</th>
                  <th className="border px-2 py-1">Checker</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">View</th>
                  <th className="border px-2 py-1">Drg Conflict</th>
                  <th className="border px-2 py-1">Attach Conflict</th>
                </>
              ) : (
                <th className="border px-2 py-1">File Name</th>
              )}
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={file.id || `${file.name}-${index}`} className="text-center text-sm">
                <td className="border px-2 py-1">{file.slno || index + 1}</td>
                {((isDrawing && isParsed) || (!isDrawing && selection)) && (
                  <td className="border px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selection?.has(file.id)}
                      onChange={() => {
                        const updated = new Set(selection);
                        if (updated.has(file.id)) updated.delete(file.id);
                        else updated.add(file.id);
                        onCheck(updated);
                      }}
                    />
                  </td>
                )}
                {isDrawing ? (
                  <>
                    <td className="border px-2 py-1">{isParsed ? file.drgNo : file.name}</td>
                    <td className="border px-2 py-1">{file.item || "-"}</td>
                    <td className="border px-2 py-1">{file.rev || "-"}</td>
                    <td className="border px-2 py-1">{file.modeler || "-"}</td>
                    <td className="border px-2 py-1">{file.detailer || "-"}</td>
                    <td className="border px-2 py-1">{file.checker || "-"}</td>
                    <td className="border px-2 py-1">{file.status || "-"}</td>
                    <td
                      className="border px-2 py-1 text-blue-600 font-semibold cursor-pointer"
                      onClick={() => openModal(file)}
                    >
                      View
                    </td>
                    <td className="border px-2 py-1"></td>
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
                  <td className="border px-2 py-1">{file.name}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [openModal, drawings, setDrawings]);

  return (
    <div className="p-4 max-w-full">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-2">
        <label className="font-semibold">Project No.</label>
        {/* Client select */}
        <label className="font-semibold">Client</label>
        <select
          value={selectedClientId || ''}
          onChange={(e) => {
            const val = e.target.value || null;
            setSelectedClientId(val);
            // filter projects locally when client selected
            if (val) {
              const filtered = (projects || []).filter(p => p.clientId === val || (p.client && p.client.id === val) || p.ownerId === val);
              setProjects(filtered);
            } else {
              // reload projects from server when client cleared
              fetch('/api/projects').then(r => r.ok ? r.json() : []).then(j => setProjects(j)).catch(() => {});
            }
          }}
          className="border rounded-md px-2 py-1 text-sm"
          disabled={loadingClients}
        >
          <option value="">{loadingClients ? 'Loading Clients...' : 'Select Client'}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.clientName || c.id}</option>
          ))}
        </select>

        <label className="font-semibold">Project No.</label>
        <select
          value={projectNo}
          onChange={handleProjectChange}
          className="border rounded-md px-2 py-1 text-sm"
          disabled={loadingProjects}
        >
          <option value="">{loadingProjects ? 'Loading...' : 'Select'}</option>
          {projects.map((proj) => (
            <option key={proj.id || proj.projectNo} value={proj.projectNo || proj.id}>
              {proj.projectNo || proj.id} - {proj.name || proj.projectName}
            </option>
          ))}
        </select>
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
        {["Drawings", "Extras", "3D Model"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm border-r ${activeTab === tab ? "bg-white font-semibold" : ""}`}
          >
            {tab} ({tab === "Drawings" ? drawings.length : tab === "Extras" ? extras.length : models.length})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white p-4 border">
        {activeTab === "Drawings" && (
          <>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="file" multiple accept=".xls,.xlsx" onChange={handleExcelUpload} ref={excelInputRef} />
                <button onClick={attachExcelToTable} className="bg-teal-800 text-white px-4 py-1 text-sm rounded">
                  Attach .xls File
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  ref={extrasInputRef}
                  onChange={(e) => {
                    if (!useDrawingStore.getState().projectNo) {
                      alert("Please select a Project No. first.");
                      return;
                    }
                    const files = Array.from(e.target.files);
                    setPendingExtraFiles(files);
                  }}
                />
                <button
                  className="bg-teal-800 text-white px-4 py-1 text-sm rounded"
                  onClick={handleAttachFiles}
                >
                  Attach Files
                </button>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    const format = e.target.value;
                    setSelectedFormat(format);
                    if (!pendingExtraFiles.length) return;
                    const regex = formatRegexMap[format];
                    const invalidFiles = pendingExtraFiles.filter((file) => !regex.test(file.name));
                    if (invalidFiles.length > 0) {
                      alert(
                        `The following files do not match the selected format (${format}):\n` +
                        invalidFiles.map((f) => `- ${f.name}`).join("\n")
                      );
                    }
                  }}
                  className="border px-2 py-1 text-sm rounded"
                >
                  <option value="">Select Format</option>
                  {formatOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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

        {activeTab === "Extras" && (
          <>
            <div className="flex gap-2 mb-2">
              <input type="file" multiple onChange={(e) => handleFileChange(e, "Extras")} ref={extrasInputRef} />
            </div>
            {renderTable(extras, false, selectedExtrasRows, setSelectedExtrasRows)}
            {selectedExtrasRows.size > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleDeleteExtras} className="bg-red-600 text-white px-6 py-2 text-sm rounded">
                  Delete Selected
                </button>
              </div>
            )}
          </>
        )}
        {activeTab === "3D Model" && (
          <>
            <div className="flex gap-2 mb-2">
              <input type="file" multiple onChange={(e) => handleFileChange(e, "3D Model")} ref={modelInputRef} />
            </div>
            {renderTable(models, false, selectedModelRows, setSelectedModelRows)}
            {selectedModelRows.size > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={handleDeleteModels} className="bg-red-600 text-white px-6 py-2 text-sm rounded">
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
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm mr-2"
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
    </div>
  );
};

export default PublishDrawing;