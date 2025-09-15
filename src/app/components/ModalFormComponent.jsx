import React from 'react';

const AssignTLModal = ({ isOpen, onClose, onSubmit, formData, onChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-brightness-50 bg-opacity-40">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-3 rounded-md shadow-lg">
        {/* Header */}
        <div className="mb-2 bg-[#176993] rounded-md ">
          <h2 className="text-md text-center p-2 font-bold text-white">Assign TL</h2>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <Input label="Project No" name="projectNo" value={formData.projectNo} onChange={onChange} readOnly />
          <Input label="Project Name" name="projectName" value={formData.projectName} onChange={onChange} />
          <Input label="Quoted Hrs." name="quotedHrs" value={formData.quotedHrs} onChange={onChange} />
          <Input label="Client Name" name="clientName" value={formData.clientName} onChange={onChange} />

          <Select label="Client PM Name" name="clientPMName" value={formData.clientPMName} onChange={onChange} options={['Amy', 'John']} />
          <Input label="No Of Sheets" name="noOfSheets" value={formData.noOfSheets} onChange={onChange} />

          <Select label="TL Code" name="tlCode" value={formData.tlCode} onChange={onChange} options={['KUL']} />
          <Input label="TL Name" name="tlName" value={formData.tlName} onChange={onChange} />
          <Input label="Designation" name="tlDesignation" value={formData.tlDesignation} onChange={onChange} />

          <Select label="Assistant TL Code" name="assistantTLCode" value={formData.assistantTLCode} onChange={onChange} options={[]} />
          <Input label="Assistant TL Name" name="assistantTLName" value={formData.assistantTLName} onChange={onChange} />
          <Input label="Assistant TL Designation" name="assistantTLDesignation" value={formData.assistantTLDesignation} onChange={onChange} />

          <Input label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={onChange} />
          <Input label="Final Date" name="finalDate" type="date" value={formData.finalDate} onChange={onChange} />

          <div className="sm:col-span-2">
            <label className="block text-gray-600 font-medium mb-1">Mail Remark</label>
            <textarea
              name="mailRemark"
              value={formData.mailRemark}
              onChange={onChange}
              className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 text-xs"
              rows={2}
            />
          </div>

          <Select label="Assistant Client PM Name" name="assistantClientPMName" value={formData.assistantClientPMName} onChange={onChange} options={[]} />
        </form>

        {/* Footer Buttons */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            type="button"
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={onSubmit}
            className="px-3 py-1 bg-[#176993] text-white rounded hover:bg-blue-700 text-xs"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTLModal;

const Input = ({ label, name, type = "text", value, onChange, readOnly }) => (
  <div>
    <label className="block text-gray-600 font-medium mb-1 text-xs">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 text-xs"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-gray-600 font-medium mb-1 text-xs">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 text-xs"
    >
      <option value="">Select</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);
