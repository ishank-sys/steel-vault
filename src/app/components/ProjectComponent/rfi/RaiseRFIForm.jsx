'use client';

import React, { useState } from "react";

const RaiseRFIForm = () => {
  const [formData, setFormData] = useState({
    projectNo: "",
    projectName: "",
    refer: "",
    question: "",
    rfiNo: "",
    projectTLName: "",
    solSketchNo: "",
    subject: "",
    drawings: "",
    effectedDrgsDesc: "",
    projectType: "",
    clientTLName: "",
    needResponseWith: "ASAP",
    askedOnDate: "",
    ccEmails: "",
    file: null,
    dontGeneratePdf: false,
    dontSendMails: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    // Submit logic here
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-screen-xl mx-auto">
      <h2 className="text-teal-700 text-center text-xl font-bold mb-6">Raise RFI</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1 */}
        <div className="space-y-3">
          <div>
            <label className="font-semibold block">Project No :</label>
            <select
              name="projectNo"
              value={formData.projectNo}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            >
              <option value="">Select</option>
              <option value="P001">P001</option>
              <option value="P002">P002</option>
            </select>
          </div>

          <div>
            <label className="font-semibold block">Project Name :</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Refer :</label>
            <input
              type="text"
              name="refer"
              value={formData.refer}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Question :</label>
            <textarea
              name="question"
              value={formData.question}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
              rows={3}
            />
          </div>

          <div>
            <label className="font-semibold block">Drawings :</label>
            <textarea
              name="drawings"
              value={formData.drawings}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
              rows={4}
            />
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-3">
          <div>
            <label className="font-semibold block">RFI No (RFI#) :</label>
            <input
              type="text"
              name="rfiNo"
              value={formData.rfiNo}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Project TL Name :</label>
            <input
              type="text"
              name="projectTLName"
              value={formData.projectTLName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">SOL Sketch No :</label>
            <input
              type="text"
              name="solSketchNo"
              value={formData.solSketchNo}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Subject :</label>
            <textarea
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
              rows={2}
            />
          </div>

          <div>
            <label className="font-semibold block">Effected Drgs. Desc. :</label>
            <textarea
              name="effectedDrgsDesc"
              value={formData.effectedDrgsDesc}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
              rows={2}
            />
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-3">
          <div>
            <label className="font-semibold block">Project Type :</label>
            <input
              type="text"
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Client TL Name :</label>
            <input
              type="text"
              name="clientTLName"
              value={formData.clientTLName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Need Response With :</label>
            <input
              type="text"
              name="needResponseWith"
              value={formData.needResponseWith}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="font-semibold block">Asked on date :</label>
            <input
              type="date"
              name="askedOnDate"
              value={formData.askedOnDate}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>
      </div>

      {/* Bottom Fields */}
      <div className="mt-6">
        <label className="font-semibold block mb-1">Cc Emails :</label>
        <input
          type="text"
          name="ccEmails"
          value={formData.ccEmails}
          onChange={handleChange}
          className="w-full border px-2 py-1 rounded"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div>
          <input
            type="file"
            name="file"
            onChange={handleChange}
            className="border px-2 py-1"
          />
        </div>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            name="dontGeneratePdf"
            checked={formData.dontGeneratePdf}
            onChange={handleChange}
          />
          <span className="font-medium">Don't generate pdf</span>
        </label>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            name="dontSendMails"
            checked={formData.dontSendMails}
            onChange={handleChange}
          />
          <span className="font-medium">Don't send mails :</span>
        </label>
      </div>

      <div className="mt-6 text-right">
        <button
          type="submit"
          className="bg-teal-800 hover:bg-teal-900 text-white px-6 py-2 rounded"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default RaiseRFIForm;
