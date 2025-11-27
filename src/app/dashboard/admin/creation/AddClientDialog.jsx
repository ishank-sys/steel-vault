"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import FolderStructure from "./FolderStructure";
import useClientStore from '../../../../stores/clientStore';

// AddClientDialog (frontend-only, JS)
// All backend logic replaced by TODO placeholders

export function AddClientDialog({
  onClientAdded,
  trigger = null,
  open,
  onOpenChange,
  hideTrigger = false,
  isEdit = false,
  initialData = null,
  clientId = null,
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const dialogOpen = typeof open === "boolean" ? open : localOpen;
  const setDialogOpen = (v) => {
    if (typeof onOpenChange === "function") onOpenChange(v);
    else setLocalOpen(v);
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    contactNo: "",
    address: "",
    notes: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFolderStructure, setShowFolderStructure] = useState(false);

  const folderStructure = useClientStore((s) => s.folderStructure);

  // Revision flags
  const [revApprovalMode, setRevApprovalMode] = useState(false);
  const [revApprovalStart, setRevApprovalStart] = useState(0);
  const [revFabMode, setRevFabMode] = useState(false);
  const [revFabStart, setRevFabStart] = useState(0);
  const [revFabFromApproval, setRevFabFromApproval] = useState(false);
  const [revFieldMode, setRevFieldMode] = useState(false);
  const [revFieldStart, setRevFieldStart] = useState(0);
  const [revFieldFromApproval, setRevFieldFromApproval] = useState(false);

  // Log options
  const [logTransmittal, setLogTransmittal] = useState(true);
  const [logSubmittal, setLogSubmittal] = useState(true);
  const [logComplete, setLogComplete] = useState(true);

  // Column defaults
  const [colFinish, setColFinish] = useState(true);
  const [colItemQty, setColItemQty] = useState(true);
  const [colBfaDate, setColBfaDate] = useState(true);

  const [sheetSize, setSheetSize] = useState("A0");

  useEffect(() => {
    if (isEdit && initialData) {
      // Prefill form and config from initialData
      setForm((f) => ({ ...f, name: initialData.name || "", email: initialData.email || "", contactNo: initialData.contactNo || "", address: initialData.address || "", notes: initialData.notes || "" }));
      setShowAdvanced(Boolean(initialData.showAdvanced));
      // Revision placeholders
      setRevApprovalMode(Boolean(initialData.revApprovalMode));
      setRevApprovalStart(initialData.revApprovalStart || 0);
      setRevFabMode(Boolean(initialData.revFabMode));
      setRevFabStart(initialData.revFabStart || 0);
      setRevFabFromApproval(Boolean(initialData.revFabFromApproval));
      setRevFieldMode(Boolean(initialData.revFieldMode));
      setRevFieldStart(initialData.revFieldStart || 0);
      setRevFieldFromApproval(Boolean(initialData.revFieldFromApproval));

      setLogTransmittal(Boolean(initialData.logTransmittal));
      setLogSubmittal(Boolean(initialData.logSubmittal));
      setLogComplete(Boolean(initialData.logComplete));

      setColFinish(Boolean(initialData.colFinish));
      setColItemQty(Boolean(initialData.colItemQty));
      setColBfaDate(Boolean(initialData.colBfaDate));

      setSheetSize(initialData.sheetSize || "A0");
    }
  }, [isEdit, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.name.trim()) {
      // minimal validation
      return;
    }

    // TODO: save client (placeholder)
    // console.log submission for debugging
    // TODO: backend logic placeholder

    // eslint-disable-next-line no-console
    console.log("SUBMIT CLIENT", {
      form,
      configuration: {
        showAdvanced,
        revApprovalMode,
        revApprovalStart,
        revFabMode,
        revFabStart,
        revFabFromApproval,
        revFieldMode,
        revFieldStart,
        revFieldFromApproval,
        logTransmittal,
        logSubmittal,
        logComplete,
        colFinish,
        colItemQty,
        colBfaDate,
        sheetSize,
      },
      folderStructure,
    });

    onClientAdded && typeof onClientAdded === "function" && onClientAdded({ ...form, folderStructure });

    setDialogOpen(false);
  }

  return (
    <div>
      {!hideTrigger && (
        <div>
          {trigger ? (
            <div onClick={() => setDialogOpen(true)}>{trigger}</div>
          ) : (
            <button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm"><PlusCircle className="w-4 h-4" /> New Client</button>
          )}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />

          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh] z-10">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{isEdit ? "Edit Client" : "Add Client"}</h3>
                  <p className="text-sm text-gray-500">Create or update a client and its configuration.</p>
                </div>
                <div>
                  <button type="button" onClick={() => setDialogOpen(false)} className="text-sm text-gray-500">Close</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Email</label>
                  <input name="email" value={form.email} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Contact No</label>
                  <input name="contactNo" value={form.contactNo} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Address</label>
                  <input name="address" value={form.address} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} />
                  <span>Show configuration</span>
                </label>
              </div>

              {showAdvanced && (
                <div className="p-3 border rounded space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Revision Structure</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={revApprovalMode} onChange={(e) => setRevApprovalMode(e.target.checked)} /> Approval Mode</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={revFabMode} onChange={(e) => setRevFabMode(e.target.checked)} /> FAB Mode</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={revFieldMode} onChange={(e) => setRevFieldMode(e.target.checked)} /> Field Mode</label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold">Log Options</h4>
                    <div className="flex gap-3 mt-2">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={logTransmittal} onChange={(e) => setLogTransmittal(e.target.checked)} /> Transmittal</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={logSubmittal} onChange={(e) => setLogSubmittal(e.target.checked)} /> Submittal</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={logComplete} onChange={(e) => setLogComplete(e.target.checked)} /> Complete</label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold">Sheet Columns & Size</h4>
                    <div className="flex gap-3 mt-2">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={colFinish} onChange={(e) => setColFinish(e.target.checked)} /> Finish</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={colItemQty} onChange={(e) => setColItemQty(e.target.checked)} /> Item Qty</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={colBfaDate} onChange={(e) => setColBfaDate(e.target.checked)} /> BFA Date</label>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 mb-1">Sheet Size</label>
                      <select value={sheetSize} onChange={(e) => setSheetSize(e.target.value)} className="px-3 py-2 border rounded">
                        <option value="A0">A0</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded h-24" />
                  </div>
                </div>
              )}

              <div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showFolderStructure} onChange={(e) => setShowFolderStructure(e.target.checked)} />
                  <span>Show folder structure</span>
                </label>
              </div>

              {showFolderStructure && (
                <div className="p-3 border rounded">
                  <FolderStructure />
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDialogOpen(false)} className="px-3 py-1.5 rounded bg-gray-100">Cancel</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 text-white">{isEdit ? "Save" : "Add Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
