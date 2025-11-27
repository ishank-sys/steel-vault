"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";

// AddProjectDialog (frontend-only, JS)
// Notes:
// - All backend logic is replaced with TODO placeholders
// - Uses plain HTML inputs + Tailwind to avoid hard dependency on shadcn paths
// - You can replace inputs/buttons with shadcn/ui components by swapping elements

export function AddProjectDialog({
  onProjectAdded,
  initialData = null,
  trigger = null,
  isEdit = false,
  open,
  onOpenChange,
  hideTrigger = false,
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const dialogOpen = typeof open === "boolean" ? open : localOpen;
  const setDialogOpen = (v) => {
    if (typeof onOpenChange === "function") onOpenChange(v);
    else setLocalOpen(v);
  };

  const [loading, setLoading] = useState(false);

  // Date states
  const [startDateState, setStartDateState] = useState(null);
  const [endDateState, setEndDateState] = useState(null);
  const [expectedCompletion, setExpectedCompletion] = useState(null);
  const [estimationDate, setEstimationDate] = useState(null);

  // Local date formatter to avoid external dependency
  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };

  // Lists
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clientPMs, setClientPMs] = useState([]);

  // formData
  const [formData, setFormData] = useState({
    projectNo: "",
    solProjectNo: "",
    name: "",
    description: "",
    clientId: "",
    solTLId: "",
    clientPm: "",
    status: "",
    priority: "",
    progress: "",
    branch: "",
    startDate: "",
    endDate: "",
    expectedCompletion: "",
    estimationDate: "",
    totalDays: "",
    totalProjectHours: "",
    actualProjectHours: "",
    totalSheetQty: "",
    weightTonnage: "",
    projectComplexity: "",
    solJobNo: "",
    projectType: "",
    projectSubType: "",
  });

  // Prefill if editing
  useEffect(() => {
    if (initialData) {
      setFormData((fd) => ({ ...fd, ...initialData }));
      if (initialData.startDate) setStartDateState(new Date(initialData.startDate));
      if (initialData.endDate) setEndDateState(new Date(initialData.endDate));
      if (initialData.expectedCompletion) setExpectedCompletion(new Date(initialData.expectedCompletion));
      if (initialData.estimationDate) setEstimationDate(new Date(initialData.estimationDate));
    }
  }, [initialData]);

  // Load lists (placeholder)
  useEffect(() => {
    setLoading(true);
    // TODO: fetch clients
    // TODO: fetch employees
    // TODO: fetch client PMs
    // Simulate placeholder data
    setTimeout(() => {
      setClients([
        { id: "1", name: "Client A" },
        { id: "2", name: "Client B" },
      ]);
      setEmployees([
        { id: "e1", name: "Employee One" },
        { id: "e2", name: "Employee Two" },
      ]);
      setClientPMs([
        { id: "pm1", name: "PM Alpha" },
        { id: "pm2", name: "PM Beta" },
      ]);
      setLoading(false);
    }, 250);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
  }

  function handleDateChange(key, v) {
    setFormData((d) => ({ ...d, [key]: v ? formatDate(v) : "" }));
    if (key === "startDate") setStartDateState(v);
    if (key === "endDate") setEndDateState(v);
    if (key === "expectedCompletion") setExpectedCompletion(v);
    if (key === "estimationDate") setEstimationDate(v);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: submit project (add or update)
    // simulate success
    const payload = { ...formData };
    // If dates are Date objects, ensure strings
    onProjectAdded && onProjectAdded(payload);
    setDialogOpen(false);
  }

  function title() {
    return isEdit ? "Edit Project" : "Add New Project";
  }

  return (
    <div>
      {!hideTrigger && (
        <div>
          {trigger ? (
            <div onClick={() => setDialogOpen(true)}>{trigger}</div>
          ) : (
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
            >
              <PlusCircle className="w-4 h-4" /> New Project
            </button>
          )}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />

          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh] z-10">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{title()}</h3>
                  <p className="text-sm text-gray-500">Create or update project details.</p>
                </div>
                <div>
                  <button type="button" onClick={() => setDialogOpen(false)} className="text-sm text-gray-500">Close</button>
                </div>
              </div>

              {/* Top Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Client Project No</label>
                  <input name="projectNo" value={formData.projectNo} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SOL Project No *</label>
                  <input name="solProjectNo" value={formData.solProjectNo} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Project Name *</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
              </div>

              {/* Client & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Client</label>
                  <select name="clientId" value={formData.clientId} onChange={handleChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Location</label>
                  <select name="branch" value={formData.branch} onChange={handleChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select location</option>
                    <option value="Noida">Noida</option>
                    <option value="Mysore">Mysore</option>
                    <option value="Kannur">Kannur</option>
                    <option value="Dehradun">Dehradun</option>
                  </select>
                </div>
              </div>

              {/* Team Lead & Client PM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Team Lead</label>
                  <div className="border rounded">
                    <select name="solTLId" value={formData.solTLId} onChange={handleChange} className="w-full px-3 py-2">
                      <option value="">Select team lead</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Client PM</label>
                  <div className="border rounded">
                    <select name="clientPm" value={formData.clientPm} onChange={handleChange} className="w-full px-3 py-2">
                      <option value="">Select client PM</option>
                      {clientPMs.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  {/* TODO: replace with Popover + Calendar from shadcn */}
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleDateChange("startDate", e.target.value ? new Date(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleDateChange("endDate", e.target.value ? new Date(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Expected Completion</label>
                  <input
                    type="date"
                    value={formData.expectedCompletion}
                    onChange={(e) => handleDateChange("expectedCompletion", e.target.value ? new Date(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              {/* Progress & Status*/}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Progress (%)</label>
                  <input name="progress" type="number" value={formData.progress} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Type / Sub type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Project Type</label>
                  <input name="projectType" value={formData.projectType} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Project Sub Type</label>
                  <input name="projectSubType" value={formData.projectSubType} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              {/* Weight & Sheets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Weight (Tonnage)</label>
                  <input name="weightTonnage" value={formData.weightTonnage} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Sheet Qty</label>
                  <input name="totalSheetQty" value={formData.totalSheetQty} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              {/* Project Hours & Total Days */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Project Hours</label>
                  <input name="totalProjectHours" value={formData.totalProjectHours} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Actual Project Hours</label>
                  <input name="actualProjectHours" value={formData.actualProjectHours} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Total Days</label>
                  <input name="totalDays" value={formData.totalDays} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              {/* Estimation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Estimation Date</label>
                  <input
                    type="date"
                    value={formData.estimationDate}
                    onChange={(e) => handleDateChange("estimationDate", e.target.value ? new Date(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">SOL Job No</label>
                  <input name="solJobNo" value={formData.solJobNo} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded h-28"></textarea>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDialogOpen(false)} className="px-3 py-1.5 rounded bg-gray-100">Cancel</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 text-white">{isEdit ? "Save" : "Add Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
