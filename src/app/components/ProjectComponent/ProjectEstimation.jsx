import React, { useState, useEffect } from 'react';

const itemOptions = [
  { name: 'Beam', code: 'B001' },
  { name: 'Column', code: 'C002' },
  { name: 'Plate', code: 'P003' }
];

const ProjectEstimation = () => {
  const [clients, setClients] = useState([]);
  const [estimationRows, setEstimationRows] = useState([]);
  const [form, setForm] = useState({
    estimatedBy: 'Document Control',
    projectName: '',
    clientId: '',              // ⬅️ changed from clientName
    estimationDate: '',
    totalProjectHours: '',
    totalSheetQty: '',
    fabricatorJobNo: '',
    projectType: '',
    projectSubType: '',
    projectInitials: '',
    weightTonnage: '',
  });

  // fetch clients
  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(setClients);
  }, []);

  const handleItemChange = (e) => {
    const itemName = e.target.value;
    const selected = itemOptions.find(item => item.name === itemName);
    if (selected) {
      setEstimationRows(prev => [
        ...prev,
        {
          itemCode: selected.code,
          itemName: selected.name,
          itemQty: '',
          sheetSize: '',
          sheetQty: '',
          d_time: '',
          c_time: '',
          tl_time: '',
          ps_time: '',
          t_time: ''
        }
      ]);
    }
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...estimationRows];
    updatedRows[index][field] = value;
    setEstimationRows(updatedRows);
  };

  const removeRow = (index) => {
    const updatedRows = estimationRows.filter((_, i) => i !== index);
    setEstimationRows(updatedRows);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      estimationRows,
      estimationDate: form.estimationDate || null,
    };

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Project estimation saved!');
      setEstimationRows([]);
      setForm({
        estimatedBy: 'Document Control',
        projectName: '',
        clientId: '',
        estimationDate: '',
        totalProjectHours: '',
        totalSheetQty: '',
        fabricatorJobNo: '',
        projectType: '',
        projectSubType: '',
        projectInitials: '',
        weightTonnage: '',
      });
    } else {
      alert('Failed to save project estimation.');
    }
  };

  return (
    <div className="p-6 text-sm">
      <h2 className="text-center font-semibold text-lg mb-4">Project Estimation</h2>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label>Estimated By</label>
          <input type="text" name="estimatedBy" className="w-full border rounded px-2 py-1" value={form.estimatedBy} onChange={handleFormChange} />
        </div>
        <div>
          <label>Project Name *</label>
          <input type="text" name="projectName" className="w-full border rounded px-2 py-1" value={form.projectName} onChange={handleFormChange} />
        </div>
        <div>
          <label>Client *</label>
          <select name="clientId" className="w-full border rounded px-2 py-1" value={form.clientId} onChange={handleFormChange}>
            <option value="">Select Client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Project Est. Date</label>
          <input type="date" name="estimationDate" className="w-full border rounded px-2 py-1" value={form.estimationDate} onChange={handleFormChange} />
        </div>
        <div>
          <label>Total Project Hours</label>
          <input type="text" name="totalProjectHours" className="w-full border rounded px-2 py-1" value={form.totalProjectHours} onChange={handleFormChange} />
        </div>
        <div>
          <label>Total Sheet Qty</label>
          <input type="text" name="totalSheetQty" className="w-full border rounded px-2 py-1" value={form.totalSheetQty} onChange={handleFormChange} />
        </div>
        {/* removed projectNo input since backend generates it */}
        <div>
          <label>Fabricator Job No.</label>
          <input type="text" name="fabricatorJobNo" className="w-full border rounded px-2 py-1" value={form.fabricatorJobNo} onChange={handleFormChange} />
        </div>
        <div>
          <label>Project Type *</label>
          <input type="text" name="projectType" className="w-full border rounded px-2 py-1" value={form.projectType} onChange={handleFormChange} />
        </div>
        <div>
          <label>Project Sub-Type *</label>
          <input type="text" name="projectSubType" className="w-full border rounded px-2 py-1" value={form.projectSubType} onChange={handleFormChange} />
        </div>
        <div>
          <label>Project Initials</label>
          <input type="text" name="projectInitials" className="w-full border rounded px-2 py-1" value={form.projectInitials} onChange={handleFormChange} />
        </div>
        <div>
          <label>Weight in Tonnage</label>
          <input type="text" name="weightTonnage" className="w-full border rounded px-2 py-1" value={form.weightTonnage} onChange={handleFormChange} />
        </div>
      </div>

      {/* estimation details table remains same */}
      ...
    </div>
  );
};

export default ProjectEstimation;
