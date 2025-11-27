"use client";

import React, { useEffect, useState } from "react";
import { UserPlus, Plus, Minus } from "lucide-react";

// AddTeamLeadDialog (frontend-only JavaScript)
// All backend logic replaced with TODO placeholders

export function AddTeamLeadDialog({
  onAdded,
  trigger = null,
  open,
  onOpenChange,
  hideTrigger = false,
  isEdit = false,
  initialData = null,
  userId = null,
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const dialogOpen = typeof open === "boolean" ? open : localOpen;
  const setDialogOpen = (v) => {
    if (typeof onOpenChange === "function") onOpenChange(v);
    else setLocalOpen(v);
  };

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [extension, setExtension] = useState("");
  const [password, setPassword] = useState("");
  const [showingCopied, setShowingCopied] = useState(false);

  const [empSearch, setEmpSearch] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedExistingId, setSelectedExistingId] = useState(null);

  const [teamMembers, setTeamMembers] = useState([{ id: Date.now(), name: "", role: "" }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // simulate employees load
    setLoadingEmployees(true);
    // TODO: fetch employees (placeholder)
    setTimeout(() => {
      setEmployees([
        { id: 1, name: "John Doe", email: "john@demo.com", contactNo: "1234567890" },
        { id: 2, name: "Jane Roe", email: "jane@demo.com", contactNo: "9876543210" },
      ]);
      setLoadingEmployees(false);
    }, 150);
  }, []);

  useEffect(() => {
    // prefill when editing
    if (isEdit && initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setExtension(initialData.extension || "");
      setPassword(initialData.password || generatePassword());
      setTeamMembers(initialData.teamMembers || [{ id: Date.now(), name: "", role: "" }]);
      setNotes(initialData.notes || "");
    }
  }, [isEdit, initialData]);

  useEffect(() => {
    if (!isEdit && dialogOpen) {
      // fresh dialog open: generate a password
      setPassword(generatePassword());
    }
  }, [dialogOpen, isEdit]);

  function generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let res = "";
    for (let i = 0; i < 10; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password || "");
      setShowingCopied(true);
      // replace toast with console.log
      // eslint-disable-next-line no-console
      console.log("Password copied");
      setTimeout(() => setShowingCopied(false), 1500);
    } catch (e) {
      // ignore
    }
  };

  const handleResetPassword = () => setPassword(generatePassword());

  const handleSelectEmployee = (id) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setSelectedExistingId(emp.id);
    setName(emp.name || "");
    setEmail(emp.email || "");
    setExtension(emp.contactNo || "");
  };

  const addTeamMemberRow = () => setTeamMembers((s) => [...s, { id: Date.now(), name: "", role: "" }]);
  const removeTeamMemberRow = (idx) => setTeamMembers((s) => s.filter((_, i) => i !== idx));
  const updateTeamMember = (idx, key, val) => setTeamMembers((s) => s.map((m, i) => (i === idx ? { ...m, [key]: val } : m)));

  const filteredEmployees = employees.filter((e) => e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.email.toLowerCase().includes(empSearch.toLowerCase()));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !name.trim()) return;
    if (!email || !email.trim()) return;

    // TODO: save team lead (placeholder)
    // eslint-disable-next-line no-console
    console.log("SUBMIT TL", { name, email, extension, password, teaminfo: teamMembers, notes });
    onAdded && typeof onAdded === "function" && onAdded();
    setDialogOpen(false);
  };

  return (
    <div>
      {!hideTrigger && (
        <div>
          {trigger ? (
            <div onClick={() => setDialogOpen(true)}>{trigger}</div>
          ) : (
            <button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-green-600 text-white text-sm"><UserPlus className="w-4 h-4" /> Add TL</button>
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
                  <h3 className="text-lg font-semibold">{isEdit ? "Edit Team Lead" : "Add Team Lead"}</h3>
                  <p className="text-sm text-gray-500">Add a team lead and assign team members.</p>
                </div>
                <div>
                  <button type="button" onClick={() => setDialogOpen(false)} className="text-sm text-gray-500">Close</button>
                </div>
              </div>

              {/* Existing employees */}
              <div className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Existing Employees</label>
                  <div className="flex items-center gap-2">
                    <input placeholder="Search..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                    <button type="button" onClick={() => { setEmpSearch(""); }} className="text-sm text-gray-500">Clear</button>
                  </div>
                </div>

                <div className="max-h-40 overflow-auto border rounded p-2">
                  {loadingEmployees ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-sm text-gray-500">No employees</div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <div key={emp.id} className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${selectedExistingId === emp.id ? 'bg-blue-50' : ''}`}>
                        <div>
                          <div className="text-sm font-medium">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleSelectEmployee(emp.id)} className="text-sm text-blue-600">Load</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Name *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Email *</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Extension</label>
                  <input value={extension} onChange={(e) => setExtension(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <input value={password} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                    <button type="button" onClick={handleResetPassword} className="px-2 py-1 bg-gray-100 rounded text-sm">Reset</button>
                    <button type="button" onClick={handleCopyPassword} className="px-2 py-1 bg-gray-100 rounded text-sm">Copy</button>
                    {showingCopied && <span className="text-xs text-green-600">Copied</span>}
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="p-3 border rounded space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Team Members</label>
                  <button type="button" onClick={addTeamMemberRow} className="inline-flex items-center gap-2 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add</button>
                </div>

                <div className="space-y-2">
                  {teamMembers.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <input value={m.name} onChange={(e) => updateTeamMember(idx, 'name', e.target.value)} placeholder="Name" className="px-2 py-1 border rounded flex-1" />
                      <input value={m.role} onChange={(e) => updateTeamMember(idx, 'role', e.target.value)} placeholder="Role" className="px-2 py-1 border rounded w-48" />
                      <button type="button" onClick={() => removeTeamMemberRow(idx)} className="text-red-600"><Minus className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded h-24" />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDialogOpen(false)} className="px-3 py-1.5 rounded bg-gray-100">Cancel</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 text-white">{isEdit ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddTeamLeadDialog;
