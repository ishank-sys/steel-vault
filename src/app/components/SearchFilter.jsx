import React, { useState, useEffect } from "react";

export default function SearchFilter({ data, searchFields, onFilteredDataChange }) {
  const [searchField, setSearchField] = useState(searchFields[0]);
  const [searchValue, setSearchValue] = useState("");
  // Use data length in deps to avoid passing the whole array (keeps dep array size stable)
  const dataLength = Array.isArray(data) ? data.length : 0;

  useEffect(() => {
    if (!onFilteredDataChange) return;

    if (!searchValue) {
      onFilteredDataChange(data);
      return;
    }

    const filtered = (Array.isArray(data) ? data : []).filter((item) => {
      const value = item[searchField];
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchValue.toLowerCase());
      }
      // support nested objects like client or solTL
      if (value && typeof value === 'object' && value.name) {
        return String(value.name).toLowerCase().includes(searchValue.toLowerCase());
      }
      return false;
    });
    onFilteredDataChange(filtered);
  }, [searchField, searchValue, dataLength, onFilteredDataChange]); 
  return (
    <div className="mb-4 flex text-black items-center gap-2">
      <label className="text-sm font-bold">Search By:</label>
      <select
        value={searchField}
        onChange={(e) => setSearchField(e.target.value)}
        className="border rounded px-2 py-1"
      >
        {searchFields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="border rounded px-2 py-1"
      />
    </div>
  );
}
