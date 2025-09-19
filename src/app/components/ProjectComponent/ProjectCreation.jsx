import React, { useState, useEffect } from 'react';

const ProjectCreation = () => {
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectName: '',
    clientId: '',
    estimationDate: '',
    startDate: '',
    endDate: '',
    totalProjectHours: '',
    totalSheetQty: '',
    totalDays: '',
  });

  useEffect(() => {
    fetch('/api/clients').then(r => r.ok ? r.json() : []).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const s = new Date(form.startDate);
      const e = new Date(form.endDate);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        const diff = Math.round((e - s) / (1000*60*60*24)) + 1;
        setForm(prev => ({ ...prev, totalDays: String(diff) }));
      }
    }
  }, [form.startDate, form.endDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = [];
    if (!form.projectName.trim()) errs.push('Project Name is required.');
    if (!form.clientId) errs.push('Client is required.');
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (errs.length) { alert(errs.join('\n')); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: form.projectName,
          clientId: form.clientId,
          estimationDate: form.estimationDate || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          totalProjectHours: form.totalProjectHours || null,
          totalSheetQty: form.totalSheetQty || null,
          totalDays: form.totalDays || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const created = await res.json();
      alert(`Project created with Project No: ${created.projectNo}`);
      setForm({ projectName: '', clientId: '', estimationDate: '', startDate: '', endDate: '', totalProjectHours: '', totalSheetQty: '', totalDays: '' });
    } catch (e) {
      alert(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 text-sm">
      <h2 className="text-center font-semibold text-lg mb-4">Create New Project</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-medium">Project Name *</label>
          <input name="projectName" value={form.projectName} onChange={handleChange} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Client *</label>
          <select name="clientId" value={form.clientId} onChange={handleChange} className="w-full border rounded px-2 py-1">
            <option value="">Select Client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Prj. Est. Date</label>
          <input type="date" name="estimationDate" value={form.estimationDate} onChange={handleChange} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Prj. Start Date</label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Prj. End Date</label>
          <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Total TL Hrs.</label>
          <input name="totalProjectHours" value={form.totalProjectHours} onChange={handleChange} className="w-full border rounded px-2 py-1" placeholder="e.g. 120" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Total Sheets</label>
          <input name="totalSheetQty" value={form.totalSheetQty} onChange={handleChange} className="w-full border rounded px-2 py-1" placeholder="e.g. 85" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Total Days</label>
          <input name="totalDays" value={form.totalDays} onChange={handleChange} className="w-full border rounded px-2 py-1" placeholder="Auto or enter" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white px-6 py-2 rounded text-sm">
          {saving ? 'Saving...' : 'Create Project'}
        </button>
        <button onClick={() => setForm({ projectName: '', clientId: '', estimationDate: '', startDate: '', endDate: '', totalProjectHours: '', totalSheetQty: '', totalDays: '' })} className="border px-6 py-2 rounded text-sm">
          Reset
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-500">Project No. is auto-generated on save.</p>
    </div>
  );
};

export default ProjectCreation;
