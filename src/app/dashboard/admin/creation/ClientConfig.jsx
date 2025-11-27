"use client";

import React, { useEffect } from "react";
import create from "zustand";
import { Trash2, Folder, File, Archive } from "lucide-react";

// ClientConfig / FolderStructure
// Preserves folder/file builder logic, uses Zustand for state.
// All backend calls are replaced with TODO placeholders.

// Zustand store
const useClientConfigStore = create((set, get) => ({
  mainZip: null,
  sections: [],
  defaultFileDetails: { fileType: "sheet", subType: "general" },
  load: (payload) => {
    // TODO: load from backend placeholder
    set((s) => ({ ...s, ...payload }));
  },
  addSection: (type) => {
    const sections = get().sections.slice();
    sections.push({ type, files: [] });
    set({ sections });
  },
  updateSection: (index, key, val) => {
    const sections = get().sections.slice();
    if (!sections[index]) return;
    sections[index] = { ...sections[index], [key]: val };
    set({ sections });
  },
  updateFileDetail: (sectionIndex, fileIndex, field, value) => {
    const sections = get().sections.slice();
    const section = sections[sectionIndex];
    if (!section) return;
    const files = section.files.slice();
    files[fileIndex] = { ...files[fileIndex], [field]: value };
    sections[sectionIndex] = { ...section, files };
    set({ sections });
  },
  removeSection: (index) => {
    const sections = get().sections.slice();
    sections.splice(index, 1);
    set({ sections });
  },
  addFileToSection: (index, file) => {
    const sections = get().sections.slice();
    const section = sections[index];
    if (!section) return;
    section.files = section.files.concat(file);
    sections[index] = section;
    set({ sections });
  },
}));

export default function ClientConfig({ initial = null }) {
  const store = useClientConfigStore();

  useEffect(() => {
    if (initial) {
      store.load(initial);
    } else {
      // default placeholder
      store.load({ mainZip: null, sections: [], defaultFileDetails: { fileType: "sheet", subType: "general" } });
    }
  }, [initial]);

  const addFolder = () => store.addSection("folder");
  const addZip = () => store.addSection("zip");
  const addFile = () => store.addSection("file");

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Folder Structure</h3>
        <div className="flex gap-2">
          <button onClick={addFolder} className="px-2 py-1 bg-gray-100 rounded flex items-center gap-2"><Folder className="w-4 h-4" /> Add Folder</button>
          <button onClick={addZip} className="px-2 py-1 bg-gray-100 rounded flex items-center gap-2"><Archive className="w-4 h-4" /> Add Zip</button>
          <button onClick={addFile} className="px-2 py-1 bg-gray-100 rounded flex items-center gap-2"><File className="w-4 h-4" /> Add File</button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="border p-3 rounded">
          <label className="block text-xs text-gray-600 mb-1">Main ZIP</label>
          <input type="text" placeholder="Main zip filename or path" value={store.mainZip || ""} onChange={(e) => store.load({ ...store, mainZip: e.target.value })} className="w-full px-3 py-2 border rounded" />
        </div>

        {store.sections.length === 0 && <div className="text-sm text-gray-500">No sections added</div>}

        {store.sections.map((sec, idx) => (
          <div key={idx} className="border rounded p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded">
                  {sec.type === "folder" && <Folder className="w-5 h-5" />}
                  {sec.type === "zip" && <Archive className="w-5 h-5" />}
                  {sec.type === "file" && <File className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-medium">{sec.type.toUpperCase()}</div>
                  <div className="text-xs text-gray-500">Section controls</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-sm text-red-600" onClick={() => store.removeSection(idx)}><Trash2 className="w-4 h-4 inline" /> Remove</button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Section Name</label>
                <input value={sec.name || ""} onChange={(e) => store.updateSection(idx, "name", e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Files</label>
                <div className="space-y-2">
                  {sec.files && sec.files.length === 0 && <div className="text-sm text-gray-500">No files</div>}
                  {sec.files && sec.files.map((f, fi) => (
                    <div key={fi} className="flex items-center justify-between gap-3 p-2 border rounded">
                      <div>
                        <div className="text-sm">{f.name || f.filename || "Unnamed"}</div>
                        <div className="text-xs text-gray-500">{f.type || "file"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={f.fileType || store.defaultFileDetails.fileType} onChange={(e) => store.updateFileDetail(idx, fi, "fileType", e.target.value)} className="px-2 py-1 border rounded text-sm">
                          <option value="sheet">Sheet</option>
                          <option value="pdf">PDF</option>
                          <option value="other">Other</option>
                        </select>
                        <button className="text-sm text-red-600" onClick={() => store.updateSection(idx, "files", (sec.files || []).filter((_, i) => i !== fi))}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="text" placeholder="Add file name" id={`new-file-${idx}`} className="px-2 py-1 border rounded flex-1" />
                <button onClick={() => {
                  const el = document.getElementById(`new-file-${idx}`);
                  const name = el ? el.value : "new-file";
                  store.addFileToSection(idx, { name, filename: name, type: "file", fileType: store.defaultFileDetails.fileType });
                  if (el) el.value = "";
                }} className="px-2 py-1 bg-gray-100 rounded">Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
