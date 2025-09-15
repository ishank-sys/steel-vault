'use client';
import React, { useState } from "react";

const SendDrawingsSubmittals = () => {
  const [formData, setFormData] = useState({
    projectNo: "",
    projectName: "",
    projectType: "",
    projectTLName: "",
    clientTLName: "",
    zipName: "",
    ccEmails: "",
    mailText: "",
    files: null,
    dontSendMails: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    // handle actual form submission
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto">
      <h2 className="text-xl font-semibold text-teal-700 mb-4 text-center">
        Send Drawings Submittals
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold">Project No.</label>
          <select
            name="projectNo"
            value={formData.projectNo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          >
            <option value="">Select</option>
            <option value="P001">P001</option>
            <option value="P002">P002</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold">Project Name</label>
          <input
            type="text"
            name="projectName"
            value={formData.projectName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block font-semibold">Project Type</label>
          <input
            type="text"
            name="projectType"
            value={formData.projectType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block font-semibold">Project TL Name</label>
          <input
            type="text"
            name="projectTLName"
            value={formData.projectTLName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block font-semibold">Client TL Name</label>
          <input
            type="text"
            name="clientTLName"
            value={formData.clientTLName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block font-semibold">Zip Name</label>
          <input
            type="text"
            name="zipName"
            value={formData.zipName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold">Cc Emails :</label>
          <input
            type="text"
            name="ccEmails"
            value={formData.ccEmails}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block font-semibold">Mail Text :</label>
          <textarea
            name="mailText"
            value={formData.mailText}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-2 py-1 h-[70px]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold">Select .dxf/nc1 Files :</label>
          <input
            type="file"
            name="files"
            multiple
            onChange={handleChange}
            className="block mt-1"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4 mt-4">
        <button
          type="submit"
          className="bg-teal-800 hover:bg-teal-900 text-white px-6 py-2 rounded text-sm"
        >
          Publish
        </button>

        <label className="inline-flex items-center text-sm">
          <input
            type="checkbox"
            name="dontSendMails"
            checked={formData.dontSendMails}
            onChange={handleChange}
            className="mr-2"
          />
          Don't send mails :
        </label>
      </div>
    </form>
  );
};

export default SendDrawingsSubmittals;
