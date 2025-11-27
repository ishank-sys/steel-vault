"use client";

import React, { useState } from "react";
import { PlusCircle } from "lucide-react";
import { AddProjectDialog } from "./AddProjectDialog";
import { AddClientDialog } from "./AddClientDialog";
import { AddTeamLeadDialog } from "./AddTeamLeadDialog";
import { AddClientPMDialog } from "./AddClientPMDialog";

export default function AdminConsole() {
  // Dialog open flags
  const [openAdd, setOpenAdd] = useState(false);
  const [openAddClient, setOpenAddClient] = useState(false);
  const [openAddTL, setOpenAddTL] = useState(false);
  const [openAddClientPM, setOpenAddClientPM] = useState(false);

  // Edit states
  const [editClient, setEditClient] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [editTL, setEditTL] = useState(null);
  const [editClientPM, setEditClientPM] = useState(null);

  // Search inputs
  const [clientSearch, setClientSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [tlSearch, setTlSearch] = useState("");
  const [clientPmSearch, setClientPmSearch] = useState("");

  // Lists (sample placeholder data)
  const [clientsList, setClientsList] = useState([
    { id: "c1", name: "Acme Corp" },
    { id: "c2", name: "Beta LLC" },
  ]);
  const [projectsList, setProjectsList] = useState([
    { id: "p1", name: "Factory Expansion" },
    { id: "p2", name: "Office Remodel" },
  ]);
  const [tlsList] = useState([
    { id: "t1", name: "Alice Johnson" },
    { id: "t2", name: "Bob Smith" },
  ]);
  const [clientPMsList] = useState([
    { id: "m1", name: "Carol White" },
    { id: "m2", name: "Dan Brown" },
  ]);

  const [loadingLists, setLoadingLists] = useState({
    clients: false,
    projects: false,
    tls: false,
    clientpms: false,
  });

  // Mini card renderer
  function miniCard(item, onEdit, onDelete) {
    return (
      <div
        key={item.id}
        className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
      >
        <div className="truncate">{item.name}</div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(item.id)}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-sm text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // Placeholder handlers
  const handleEdit = (type, id) => {
    // placeholder: pretend to fetch item and open dialog
    const findItem = (list) => list.find((x) => x.id === id) || null;
    if (type === "client") {
      setEditClient(findItem(clientsList));
      setOpenAddClient(true);
    }
    if (type === "project") {
      setEditProject(findItem(projectsList));
      setOpenAdd(true);
    }
    if (type === "tl") {
      setEditTL(findItem(tlsList));
      setOpenAddTL(true);
    }
    if (type === "clientpm") {
      setEditClientPM(findItem(clientPMsList));
      setOpenAddClientPM(true);
    }
  };

  const handleDelete = (type, id) => {
    // placeholder delete action
    // In real app, call API and refresh list
    // eslint-disable-next-line no-console
    console.log("delete", type, id);
  };

  // Filter helpers
  const filterList = (list, search) =>
    list.filter((x) =>
      x.name.toLowerCase().includes(String(search).toLowerCase())
    );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-sm text-gray-600 mt-2">
          Manage core admin entities: clients, projects, team leads and client
          PMs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Clients Card */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Clients</h2>
              <p className="text-xs text-gray-500">Add or manage clients</p>
            </div>
            <button
              onClick={() => setOpenAddClient(true)}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <PlusCircle className="w-4 h-4" /> New
            </button>
          </div>

          <input
            placeholder="Search clients..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="mb-3 px-3 py-2 border rounded text-sm"
          />

          <div className="overflow-auto" style={{ maxHeight: 300 }}>
            {loadingLists.clients ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              (() => {
                const filtered = filterList(clientsList, clientSearch);
                if (filtered.length === 0)
                  return <div className="text-sm text-gray-500">No items</div>;
                return filtered.map((c) =>
                  miniCard(
                    c,
                    (id) => handleEdit("client", id),
                    (id) => handleDelete("client", id)
                  )
                );
              })()
            )}
          </div>
        </div>

        {/* Projects Card */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Projects</h2>
              <p className="text-xs text-gray-500">Add or manage projects</p>
            </div>
            <button
              onClick={() => setOpenAdd(true)}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <PlusCircle className="w-4 h-4" /> New
            </button>
          </div>

          <input
            placeholder="Search projects..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="mb-3 px-3 py-2 border rounded text-sm"
          />

          <div className="overflow-auto" style={{ maxHeight: 300 }}>
            {loadingLists.projects ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              (() => {
                const filtered = filterList(projectsList, projectSearch);
                if (filtered.length === 0)
                  return <div className="text-sm text-gray-500">No items</div>;
                return filtered.map((p) =>
                  miniCard(
                    p,
                    (id) => handleEdit("project", id),
                    (id) => handleDelete("project", id)
                  )
                );
              })()
            )}
          </div>
        </div>

        {/* Team Leads Card */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Team Leads</h2>
              <p className="text-xs text-gray-500">Add or manage team leads</p>
            </div>
            <button
              onClick={() => setOpenAddTL(true)}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <PlusCircle className="w-4 h-4" /> New
            </button>
          </div>

          <input
            placeholder="Search team leads..."
            value={tlSearch}
            onChange={(e) => setTlSearch(e.target.value)}
            className="mb-3 px-3 py-2 border rounded text-sm"
          />

          <div className="overflow-auto" style={{ maxHeight: 300 }}>
            {loadingLists.tls ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              (() => {
                const filtered = filterList(tlsList, tlSearch);
                if (filtered.length === 0)
                  return <div className="text-sm text-gray-500">No items</div>;
                return filtered.map((t) =>
                  miniCard(
                    t,
                    (id) => handleEdit("tl", id),
                    (id) => handleDelete("tl", id)
                  )
                );
              })()
            )}
          </div>
        </div>

        {/* Client PMs Card */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Client PMs</h2>
              <p className="text-xs text-gray-500">
                Add or manage client project managers
              </p>
            </div>
            <button
              onClick={() => setOpenAddClientPM(true)}
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <PlusCircle className="w-4 h-4" /> New
            </button>
          </div>

          <input
            placeholder="Search client PMs..."
            value={clientPmSearch}
            onChange={(e) => setClientPmSearch(e.target.value)}
            className="mb-3 px-3 py-2 border rounded text-sm"
          />

          <div className="overflow-auto" style={{ maxHeight: 300 }}>
            {loadingLists.clientpms ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              (() => {
                const filtered = filterList(clientPMsList, clientPmSearch);
                if (filtered.length === 0)
                  return <div className="text-sm text-gray-500">No items</div>;
                return filtered.map((m) =>
                  miniCard(
                    m,
                    (id) => handleEdit("clientpm", id),
                    (id) => handleDelete("clientpm", id)
                  )
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* Dialog placeholders */}
      {/* Add Project Dialog (wired to Projects "New" button) */}
      <AddProjectDialog
        open={openAdd}
        onOpenChange={(v) => setOpenAdd(v)}
        isEdit={false}
        hideTrigger={true}
        onProjectAdded={(p) => {
          // placeholder: append project to list
          setProjectsList((prev) => [
            {
              id: p.id || `new-${Date.now()}`,
              name: p.name || p.projectNo || "New Project",
            },
            ...prev,
          ]);
        }}
      />

      {/* Add Client Dialog (wired to Clients "New" button) */}
      <AddClientDialog
        open={openAddClient}
        onOpenChange={(v) => setOpenAddClient(v)}
        isEdit={false}
        hideTrigger={true}
        onClientAdded={(c) => {
          setClientsList((prev) => [
            { id: c.id || `new-${Date.now()}`, name: c.name || "New Client" },
            ...prev,
          ]);
        }}
      />

      {/* Add Team Lead Dialog (wired to Team Leads "New" button) */}
      <AddTeamLeadDialog
        hideTrigger={true}
        open={openAddTL}
        onOpenChange={(v) => setOpenAddTL(v)}
        initialData={editTL}
        isEdit={!!editTL}
        onAdded={() => {
          setEditTL(null);
          setOpenAddTL(false);
        }}
      />

      {/* Add Client PM Dialog (wired to Client PMs "New" button) */}
      <AddClientPMDialog
        hideTrigger={true}
        open={openAddClientPM}
        onOpenChange={(v) => setOpenAddClientPM(v)}
        initialData={editClientPM}
        isEdit={!!editClientPM}
        onAdded={() => {
          setEditClientPM(null);
          setOpenAddClientPM(false);
        }}
      />

      {openAddClientPM && (
        <div className="fixed inset-0 flex items-end justify-center p-4">
          {/* Client PM Dialog Placeholder */}
          <div className="bg-white p-4 rounded shadow">
            Client PM Dialog Placeholder
          </div>
        </div>
      )}
    </div>
  );
}
