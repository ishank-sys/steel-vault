"use client";

import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

// AddClientPMDialog (frontend-only)
// Backend logic removed and replaced with TODO placeholders

export function AddClientPMDialog({
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState("");

  function randomPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  useEffect(() => {
    if (isEdit && initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setClientId(initialData.clientId || "");
      setPassword(initialData.password || randomPassword());
    }
  }, [isEdit, initialData]);

  useEffect(() => {
    if (!dialogOpen) return;
    setLoading(true);
    // TODO: backend logic placeholder - load clients
    setTimeout(() => {
      setClients([
        { id: 1, name: "Client A" },
        { id: 2, name: "Client B" },
      ]);
      setLoading(false);
    }, 150);
  }, [dialogOpen]);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(clientFilter.toLowerCase()));

  const handleSelectClient = (id) => {
    setClientId(id);
    setClientOpen(false);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password || "");
      // replace toast with console.log
      // eslint-disable-next-line no-console
      console.log("Password copied");
    } catch (e) {
      // ignore
    }
  };

  const handleResetPassword = () => setPassword(randomPassword());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !name.trim()) return;
    if (!email || !email.trim()) return;
    if (!clientId) return;

    // TODO: backend save placeholder
    // eslint-disable-next-line no-console
    console.log("SUBMIT CLIENT PM", { name, email, clientId, password });
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
            <button onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm"><UserPlus className="w-4 h-4" /> Add Client PM</button>
          )}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDialogOpen(false)} />

          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh] z-10">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{isEdit ? "Edit Client PM" : "Add Client PM"}</h3>
                  <p className="text-sm text-gray-500">Assign a project manager to a client.</p>
                </div>
                <div>
                  <button type="button" onClick={() => setDialogOpen(false)} className="text-sm text-gray-500">Close</button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Email *</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Client *</label>
                <div className="relative">
                  <button type="button" className="w-full px-3 py-2 border rounded text-left" onClick={() => setClientOpen((s) => !s)} role="combobox">
                    {clients.find((c) => String(c.id) === String(clientId))?.name || "Select client"}
                  </button>
                  {clientOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow z-20">
                      <div className="p-2">
                        <input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="Search clients..." className="w-full px-2 py-1 border rounded text-sm" />
                      </div>
                      <div className="max-h-40 overflow-auto">
                        {loading ? (
                          <div className="p-2 text-sm text-gray-500">Loading...</div>
                        ) : filtered.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">No clients</div>
                        ) : (
                          filtered.map((c) => (
                            <div key={c.id} className="p-2 hover:bg-gray-50 flex items-center justify-between">
                              <div>
                                <div className="text-sm">{c.name}</div>
                              </div>
                              <div>
                                <button type="button" onClick={() => handleSelectClient(c.id)} className="text-sm text-blue-600">Select</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <input value={password} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
                  <button type="button" onClick={handleResetPassword} className="px-2 py-1 bg-gray-100 rounded text-sm">Reset</button>
                  <button type="button" onClick={handleCopyPassword} className="px-2 py-1 bg-gray-100 rounded text-sm">Copy</button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setDialogOpen(false)} className="px-3 py-1.5 rounded bg-gray-100">Cancel</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 text-white">{isEdit ? "Save" : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddClientPMDialog;
