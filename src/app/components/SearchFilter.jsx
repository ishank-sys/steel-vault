import React, { useState, useEffect, useMemo } from "react";

// Unified search input: searches across all provided searchFields; dropdown removed
export default function SearchFilter({ data = [], searchFields = [], onFilteredDataChange }) {
  const [searchValue, setSearchValue] = useState("");
  // Use data length in deps to avoid passing the whole array (keeps dep array size stable)
  const dataLength = Array.isArray(data) ? data.length : 0;

  // Small debounce to avoid filtering on every keystroke aggressively
  const debouncedSearch = useDebouncedValue(searchValue, 200);

  useEffect(() => {
    if (!onFilteredDataChange) return;

    // If no query, return original list
    if (!debouncedSearch) {
      onFilteredDataChange(data);
      return;
    }

    const q = String(debouncedSearch).toLowerCase();

    const filtered = (Array.isArray(data) ? data : []).filter((item) => {
      if (!searchFields || searchFields.length === 0) return false;
      return searchFields.some((field) => {
        const value = item?.[field];
        if (value == null) return false;
        if (typeof value === "string" || typeof value === "number") {
          return String(value).toLowerCase().includes(q);
        }
        // support nested objects like client or solTL
        if (typeof value === "object") {
          if (value.name) return String(value.name).toLowerCase().includes(q);
          // Fallback: scan shallow values
          try {
            return Object.values(value).some((v) =>
              (typeof v === "string" || typeof v === "number") && String(v).toLowerCase().includes(q)
            );
          } catch {
            return false;
          }
        }
        return false;
      });
    });
    onFilteredDataChange(filtered);
  }, [debouncedSearch, dataLength, onFilteredDataChange, searchFields]);

  return (
    <div className="mb-4 flex text-black items-center gap-2">
      <label htmlFor="search-filter-input" className="text-sm font-bold">Search:</label>
      <input
        type="text"
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        id="search-filter-input"
        className="border rounded px-2 py-1 w-full max-w-md"
      />
    </div>
  );
}

// Hook: debounced value for smoother typing
function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
