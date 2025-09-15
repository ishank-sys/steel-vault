'use client';
import React, { useState } from "react";

const ExtraHoursForm = () => {
  const [formData, setFormData] = useState({
    projectNo: "",
    delta: "",
    asi: "",
    projectName: "",
    tlName: "",
    totalHours: "",
    projectType: "",
    bfaDrg: "",
    clientName: "",
    receivedDate: "",
    extraHoursTaken: "",
    extraCharges: "",
    effectedRFI: "",
    cor: "",
    ccEmails: "",
    description: "",
    file: null,
    allowExtraHours: false,
    allowExtraCharges: false,
    dontSendMails: false,
    availableDrawings: ["DWG001", "DWG002", "DWG003", "DWG004", "DWG005", "DWG006"],
    selectedDrawings: [],
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setFormData((prev) => ({ ...prev, file: files }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const moveDrawing = (from, to) => {
    if (formData[from].length === 0) return;
    const [moved, ...rest] = formData[from];
    setFormData((prev) => ({
      ...prev,
      [from]: rest,
      [to]: [...prev[to], moved],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    // Submission logic here
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-screen-xl mx-auto">
      <h2 className="text-center text-teal-600 text-xl font-bold mb-6">Extra Hours</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1 */}
        <div className="space-y-3">
          <div>
            <label className="block font-semibold">Project No :</label>
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
            <label className="block font-semibold">Delta# :</label>
            <input
              type="text"
              name="delta"
              value={formData.delta}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Project Name :</label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Project Type :</label>
            <input
              type="text"
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Extra Hours Taken :</label>
            <input
              type="text"
              name="extraHoursTaken"
              value={formData.extraHoursTaken}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">COR :</label>
            <input
              type="text"
              name="cor"
              value={formData.cor}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-3">
          <div>
            <label className="block font-semibold">ASI# :</label>
            <input
              type="text"
              name="asi"
              value={formData.asi}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">TL Name :</label>
            <input
              type="text"
              name="tlName"
              value={formData.tlName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Total Hours :</label>
            <input
              type="text"
              name="totalHours"
              value={formData.totalHours}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Extra Hours Charges($) :</label>
            <input
              type="text"
              name="extraCharges"
              value={formData.extraCharges}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Effected RFI :</label>
            <textarea
              name="effectedRFI"
              value={formData.effectedRFI}
              onChange={handleChange}
              rows={2}
              className="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-3">
          <div>
            <label className="block font-semibold">BFA Drg# :</label>
            <input
              type="text"
              name="bfaDrg"
              value={formData.bfaDrg}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Client Name :</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Received Date :</label>
            <input
              type="date"
              name="receivedDate"
              value={formData.receivedDate}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold">Description :</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full border px-2 py-1 rounded"
            />
          </div>
        </div>
      </div>

      {/* Drawings and Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Available and Selected Drawings */}
        <div>
          <label className="block font-bold">Available Drawings</label>
          <select multiple className="w-full  border px-2 py-1 rounded">
            {formData.availableDrawings.map((item, i) => (
              <option key={i}>{item}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 mt-10">
          <button
            type="button"
            onClick={() => moveDrawing("availableDrawings", "selectedDrawings")}
            className="border px-2 py-1 rounded hover:bg-gray-200"
          >
            &gt;
          </button>
          <button
            type="button"
            onClick={() => moveDrawing("selectedDrawings", "availableDrawings")}
            className="border px-2 py-1 rounded hover:bg-gray-200"
          >
            &lt;
          </button>
        </div>

        <div>
          <label className="block font-bold">Selected Drawings</label>
          <select multiple className="w-full border px-2 py-1 rounded">
            {formData.selectedDrawings.map((item, i) => (
              <option key={i}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cc Emails, checkboxes, file and submit */}
      <div className="mt-6">
        <label className="font-semibold block mb-1">Cc EMails :</label>
        <input
          type="text"
          name="ccEmails"
          value={formData.ccEmails}
          onChange={handleChange}
          className="w-full border px-2 py-1 rounded"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <input type="file" name="file" onChange={handleChange} />

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            name="allowExtraHours"
            checked={formData.allowExtraHours}
            onChange={handleChange}
          />
          <span>Allow Extra Hours</span>
        </label>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            name="allowExtraCharges"
            checked={formData.allowExtraCharges}
            onChange={handleChange}
          />
          <span>Allow Extra Charges</span>
        </label>

        <label className="inline-flex items-center space-x-2 ml-auto">
          <input
            type="checkbox"
            name="dontSendMails"
            checked={formData.dontSendMails}
            onChange={handleChange}
          />
          <span>Don't send mails :</span>
        </label>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2 rounded"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default ExtraHoursForm;
