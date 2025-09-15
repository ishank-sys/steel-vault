'use client';
import React, { useState } from "react";

const AddItemCodes = () => {
  const [formData, setFormData] = useState({
    itemCode: "",
    itemName: "",
    itemCategory: "",
    itemSubCategory: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    // Add your save logic here
  };

  return (
    <div className="border border-gray-300 shadow-sm rounded-md w-full max-w-5xl mx-auto mt-6">
      <div className="bg-gray-300 font-bold text-center p-2 rounded-t-md">
          Add Item Codes
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8"
      >
        {/* Item Code */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Item Code</label>
          <input
            type="text"
            name="itemCode"
            value={formData.itemCode}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </div>

        {/* Item Name */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Item Name</label>
          <input
            type="text"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </div>

        {/* Item Category */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Item Category</label>
          <select
            name="itemCategory"
            value={formData.itemCategory}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="">Select</option>
            <option value="Steel">Steel</option>
            <option value="Concrete">Concrete</option>
          </select>
        </div>

        {/* Item SubCategory */}
        <div className="flex flex-col">
          <label className="font-semibold mb-1">Item SubCategory</label>
          <select
            name="itemSubCategory"
            value={formData.itemSubCategory}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="">Please Select</option>
            <option value="Beam">Beam</option>
            <option value="Column">Column</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="mt-2">
          <button
            type="submit"
            className="bg-teal-800 hover:bg-teal-900 text-white px-6 py-2 rounded text-sm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddItemCodes;
