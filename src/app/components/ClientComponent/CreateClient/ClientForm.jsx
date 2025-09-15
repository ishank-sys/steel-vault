'use client';

import React from 'react';
import useClientStore from '../../../../stores/clientStore';

export default function ClientForm() {
  const { clientTabData, setClientTabData } = useClientStore();

  const fields = [
    'Name', 'Client Name'
  ];

  const handleChange = (label, value) => {
    setClientTabData((draft) => {
      draft.formData[label] = value;
    });
  };

  const handleAddressChange = (type, field, value) => {
    setClientTabData((draft) => {
      draft.addresses[type][field] = value;
    });
  };

  return (
    <div>
      {/* Client details */}
      <h3 className="font-bold text-lg text-center mb-6">Client Details</h3>
      <div className="grid grid-cols-2 gap-4 mt-2">
        {fields.map((label) => (
          <div key={label}>
            <label className="font-bold">{label}</label>
            {label === 'Account Type' ? (
              <select
                className="border rounded w-full p-1"
                value={clientTabData.formData?.[label] || ''}
                onChange={(e) => handleChange(label, e.target.value)}
              >
                <option value="">Select</option>
                <option value="1">1</option>
                <option value="0">0</option>
              </select>
            ) : (
              <input
                className="border rounded w-full p-1"
                value={clientTabData.formData?.[label] || ''}
                onChange={(e) => handleChange(label, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
