import React, { useEffect, useRef, useState } from 'react';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import Link from 'next/link';

const TableComponent = ({
  headers = [],
  keys = [],
  data = [],
  showActions = false,
  onView,
  onEdit,
  onDelete,
  actionHeaderText = "Action",
  cellClickHandlers = {},
  customColumns = [], 
  // Loading UX
  loading: loadingProp, // optional: parent-driven loading state
  emptyTimeoutMs = 8000, // how long to show Loading... before No data when length===0
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const currentData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Local loading timeout fallback when parent doesn't provide loading
  const [timePassed, setTimePassed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // If there is data, ensure we are not in loading fallback
    if (Array.isArray(data) && data.length > 0) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setTimePassed(true);
      return;
    }
    // No data: start or reset timer
    setTimePassed(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    timerRef.current = setTimeout(() => setTimePassed(true), Math.max(0, Number(emptyTimeoutMs) || 0));
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [Array.isArray(data) ? data.length : 0, emptyTimeoutMs]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="overflow-x-auto rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-[#176993]">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-2 py-3 text-center text-sm font-medium text-white uppercase tracking-wider">
                {header}
              </th>
            ))}
            {customColumns.map((col, idx) => (
              <th key={`custom-head-${idx}`} className="px-4 py-3 text-center text-sm font-medium text-white uppercase tracking-wider">
                {col.header}
              </th>
            ))}
            {showActions && (
              <th className="px-4 py-3 text-center text-sm font-medium text-white uppercase tracking-wider">
                {actionHeaderText}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {currentData.length === 0 ? (
            <tr>
              <td colSpan={headers.length + customColumns.length + (showActions ? 1 : 0)} className="px-4 py-6 text-center text-gray-500">
                {loadingProp === true || (loadingProp === undefined && !timePassed)
                  ? 'Loading...'
                  : 'No data available.'}
              </td>
            </tr>
          ) : (
            currentData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-gray-50">
                {keys.map((key, cellIndex) => {
                  const handleClick = cellClickHandlers[key];
                  const raw = row[key];
                  let display = '-';
                  if (raw === null || raw === undefined) display = '-';
                  else if (typeof raw === 'object') {
                    if (raw.name) display = raw.name;
                    else display = JSON.stringify(raw);
                  } else display = String(raw);

                  return (
                    <td
                      key={cellIndex}
                      className={`px-4 py-3 text-center text-sm text-gray-700 ${
                        handleClick ? 'text-blue-600 underline cursor-pointer' : ''
                      }`}
                      onClick={() => handleClick && handleClick(row)}
                    >
                      {display}
                    </td>
                  );
                })}
                {customColumns.map((col, idx) => (
                  <td key={`custom-${idx}`} className="px-4 py-3 text-center text-sm text-gray-700">
                    {col.render(row)}
                  </td>
                ))}
                {showActions && (
                  <td className="px-4 py-3 text-center space-x-2">
                    {onView && <button onClick={() => onView(row)} className="text-blue-600 hover:text-blue-800" title="View"><FaEye /></button>}
                    {onEdit && <button onClick={() => onEdit(row)} className="text-yellow-500 hover:text-yellow-600" title="Edit"><FaEdit /></button>}
                    {onDelete && <button onClick={() => onDelete(row)} className="text-red-500 hover:text-red-600" title="Delete"><FaTrash /></button>}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50">
            Prev
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index + 1)}
              className={`px-3 py-1 rounded ${currentPage === index + 1 ? 'bg-[#176993] text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {index + 1}
            </button>
          ))}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TableComponent;
