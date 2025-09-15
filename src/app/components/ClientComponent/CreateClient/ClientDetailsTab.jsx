import React from 'react';

const ClientDetailsTab = ({ details, setDetails }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Client Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-3">
          <label className="block font-medium mb-1">Client Name</label>
          <input
            type="text"
            name="name"
            value={details.name || ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={details.email || ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Company Name</label>
          <input
            type="text"
            name="companyName"
            value={details.companyName || ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Contact No</label>
          <input
            type="text"
            name="contactNo"
            value={details.contactNo || ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div className="md:col-span-2 mb-3">
          <label className="block font-medium mb-1">Address</label>
          <textarea
            name="address"
            value={details.address || ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsTab;