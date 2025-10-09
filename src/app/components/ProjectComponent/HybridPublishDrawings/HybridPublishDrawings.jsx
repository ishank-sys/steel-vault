'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import useDrawingStore from '../../../../stores/useDrawingStore';
import { useRouter } from 'next/navigation';


const HybridPublishDrawings = () => {
  const { approvedDrawings, projectName, projectNo, setSelectedDrawings, sequenceNo, subItem1, subItem2, zipName, setSequenceNo, setSubItem1, setSubItem2, updateZipName, generateLogName, clearLogName, transmittalName, submittalName } = useDrawingStore();
  const [mappedDrawings, setMappedDrawings] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [voidedRows, setVoidedRows] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [selectedModalFiles, setSelectedModalFiles] = useState(new Set());
  const selectAllRef = useRef(null);

  const router = useRouter();


const handleNextClick = () => {
  const selected = Array.from(selectedRows).map((idx) => {
    const row = mappedDrawings[idx];
    return {
      ...row,
      void: voidedRows.has(idx), // store void status in the row
    };
  });

  setSelectedDrawings(selected);
    // Navigate to the TransmittalForm page
    router.push('/dashboard/project/project/publish_drawings/hybrid_publish_drawings/transmittal_form');
  };


  const toggleRowSelection = useCallback((index) => {
    setSelectedRows((prev) => {
      const updated = new Set(prev);
      if (updated.has(index)) updated.delete(index);
      else updated.add(index);
      return updated;
    });
  }, []);

  const allSelected = mappedDrawings.length > 0 && selectedRows.size === mappedDrawings.length;

  const toggleSelectAll = useCallback(() => {
    setSelectedRows((prev) => {
      const total = mappedDrawings.length;
      if (prev.size === total) {
        return new Set(); // Deselect all
      }
      return new Set(Array.from({ length: total }, (_, i) => i)); // Select all indices
    });
  }, [mappedDrawings.length]);

  const selectAllRows = useCallback(() => {
    const total = mappedDrawings.length;
    setSelectedRows(new Set(Array.from({ length: total }, (_, i) => i)));
  }, [mappedDrawings.length]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const [formData, setFormData] = useState({
    approvalDate: '',
    bfaDate: '',
    fabDate: '',
    revision: '',
    sheetSize: '',
  });

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFieldUpdate = useCallback((field, value) => {
    setMappedDrawings((prev) =>
      prev.map((row, idx) =>
        selectedRows.has(idx)
          ? { ...row, [field]: value }
          : row
      )
    );
  }, [selectedRows]);

  const openModal = useCallback((row) => {
    if (!row.attachedPdfs || row.attachedPdfs.length === 0) {
      alert(`No PDF attached for drawing ${row.drawingNo || row.drgNo}`);
      return;
    }
    setModalFiles(row.attachedPdfs);
    // Ensure selectedModalFiles is initialized correctly based on actual file objects
    setSelectedModalFiles(new Set(row.attachedPdfs.map(f => f.name)));
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalFiles([]);
    setSelectedModalFiles(new Set());
  }, []);

  const handleModalCheckboxChange = useCallback((fileName) => {
    setSelectedModalFiles(prev => {
      const updated = new Set(prev);
      if (updated.has(fileName)) updated.delete(fileName);
      else updated.add(fileName);
      return updated;
    });
  }, []);

  const handleSelectAllModal = useCallback((e) => {
    if (e.target.checked) {
      setSelectedModalFiles(new Set(modalFiles.map((f) => f.name)));
    } else {
      setSelectedModalFiles(new Set());
    }
  }, [modalFiles]);

  const handleDownloadSelected = useCallback(() => {
    if (!selectedModalFiles.size) return alert("Please select files to download.");
    modalFiles.forEach((file) => {
      if (selectedModalFiles.has(file.name)) {
        // Assuming file.file exists and is the actual Blob/File object if attached from FileUpload component
        // Or if file itself is the Blob/File object (e.g., from state)
        const blobOrFile = file.file || file;
        if (blobOrFile) {
          const url = URL.createObjectURL(blobOrFile);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url); // Clean up the object URL
        } else {
          console.warn(`File object not found for ${file.name}`);
        }
      }
    });
  }, [modalFiles, selectedModalFiles]);

  const handleRemoveModalFile = useCallback((fileName) => {
    setModalFiles(prev => prev.filter((f) => f.name !== fileName));
    setSelectedModalFiles(prev => {
      const updated = new Set(prev);
      updated.delete(fileName);
      return updated;
    });
  }, []);


  // --- MODIFICATION STARTS HERE ---
  useEffect(() => {
    // Get today's date formatted as YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    const enrichedDrawings = approvedDrawings.map((d) => {
      const rev = d.rev || '';
      // Regex to check if 'rev' is purely numeric (e.g., "0", "1", "23")
      const isNumericRev = /^\d+$/.test(rev);
      // Regex to check if 'rev' is purely alphabetic (e.g., "A", "B", "XYZ")
      const isAlphaRev = /^[a-zA-Z]+$/.test(rev);

      return {
        itemName: d.item || '-',
        drawingNo: d.drgNo || '-',
        // Apply new logic for dates:
        // If rev is numeric, set dateSentForFab to today. Otherwise, use existing d.fabDate or ''.
        dateSentForFab: isNumericRev ? today : (d.fabDate || ''),
        // If rev is alphabetic, set dateSentForApproval to today. Otherwise, use existing d.approvalDate or ''.
        dateSentForApproval: isAlphaRev ? today : (d.approvalDate || ''),
        bfaDate: d.bfaDate || '',
        rev: rev,
        sheetSize: '11x17', // Assuming this is a constant value for this display
        detailer: d.detailer || '-',
        checker: d.checker || '-',
        attachedPdfs: d.attachedPdfs || [],
      };
    });

    setMappedDrawings(enrichedDrawings);
  }, [approvedDrawings]);
  // --- MODIFICATION ENDS HERE ---

  // Keep the Select All checkbox indeterminate when partially selected
  useEffect(() => {
    if (!selectAllRef.current) return;
    const total = mappedDrawings.length;
    const count = selectedRows.size;
    selectAllRef.current.indeterminate = count > 0 && count < total;
  }, [mappedDrawings.length, selectedRows]);

  // Memoize table headers to avoid recreation
  const tableHeaders = useMemo(() => [
    'Select',
    'Item Name',
    'Drawing No',
    'Date Sent for Approval',
    'Date Sent for Fab/Field',
    'BFA Date',
    'Rev.',
    'Sheet Size',
    'Detailer',
    'Checker',
    'Attachment',
  ], []);

  // Mock function for handleUpdate, if it's meant to be used elsewhere
  // const handleUpdate = (field) => { /* ... */ };

  return (
    <div className="p-6 bg-white text-gray-800 max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8 text-teal-700">
        Hybrid Publish Drawings
      </h2>

      {/* Top Form Layout */}
      <div className="grid md:grid-cols-2 gap-y-6 mb-8">
        {/* Left Column */}
        <div className="space-y-4">
          <ReadOnlyField label="Project Name :" value={projectName} />
          <LabeledDateUpdate
            label="Date Send For Approval :"
            value={formData.approvalDate}
            onChange={(val) => handleChange('approvalDate', val)}
            onUpdate={() => handleFieldUpdate('dateSentForApproval', formData.approvalDate)}
            field="dateSentForApproval"
          />
          <LabeledDateUpdate
            label="BFA Date:"
            value={formData.bfaDate}
            onChange={(val) => handleChange('bfaDate', val)}
            onUpdate={() => handleFieldUpdate('bfaDate', formData.bfaDate)}
            field="bfaDate"
          />
          <LabeledDateUpdate
            label="Date Send for Fab/Field :"
            value={formData.fabDate}
            onChange={(val) => handleChange('fabDate', val)}
            onUpdate={() => handleFieldUpdate('dateSentForFab', formData.fabDate)}
            field="dateSentForFab"
          />

          <InputField
            className="bg-gray-100"
            label="Revision :"
            value={formData.revision}
            onChange={(val) => handleChange('revision', val)}
            onUpdate={() => handleFieldUpdate('rev', formData.revision)}
            field="rev"
          />
          <InputField
            className="bg-gray-100"
            label="Sheet size :"
            value={formData.sheetSize}
            onChange={(val) => handleChange('sheetSize', val)}
            onUpdate={() => handleFieldUpdate('sheetSize', formData.sheetSize)}
            field="sheetSize"
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <ReadOnlyUpdateField
            label="Project No. :"
            value={projectNo}
          // onUpdate={() => handleUpdate('Project No.')} // Assuming handleUpdate is defined elsewhere or this is a placeholder
          />
          <ReadOnlyUpdateField
            label="Client Name. :"
            value="Clint Darnell" // Hardcoded, assuming this is correct
          // onUpdate={() => handleUpdate('Client Name')}
          />

          {/* Sequence No and Submittal Item Name */}
          <div className="grid grid-cols-1 gap-4">
            <InputField
              label="SEQUENCE NO :"
              value={sequenceNo}
              onChange={(val) => { setSequenceNo(val); updateZipName(); }}
            />
            {/* Submittal Send for */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-medium mb-1">Submittal Send for :</label>
                <textarea className="input bg-gray-200 resize-none h-8 w-full" rows={1} value={subItem1} onChange={(e)=> { setSubItem1(e.target.value); updateZipName(); }} />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-medium mb-1">Submittal Item Name :</label>
                <textarea className="input bg-gray-200 resize-none h-8 w-full" rows={1} value={subItem2} onChange={(e)=> { setSubItem2(e.target.value); updateZipName(); }} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <InputField label="Transmittal Name:" value={transmittalName} onChange={()=>{}} readOnly />
              <InputField label="Submittal Name:" value={submittalName} onChange={()=>{}} readOnly />
              <InputField label="Zip Name:" value={zipName} onChange={()=>{}} readOnly />
            </div>
          </div>
        </div>
      </div>

      <div className="flex pt-2 gap-2 mb-4 flex-wrap items-center">
        <button
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm"
          type="button"
          onClick={selectAllRows}
        >
          Select All
        </button>
        <button
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm"
          type="button"
          onClick={clearSelection}
        >
          Clear Selection
        </button>
        <button
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm"
          onClick={() => {
            setVoidedRows(prev => {
              const updated = new Set(prev);
              selectedRows.forEach(idx => updated.add(idx));
              return updated;
            });
          }}
        >
          Void Item
        </button>
        <button
          className="bg-teal-800 text-white px-4 py-2 rounded text-sm"
          onClick={() => {
            setVoidedRows(prev => {
              const updated = new Set(prev);
              selectedRows.forEach(idx => updated.delete(idx));
              return updated;
            });
          }}
        >
          Unvoid Item
        </button>
        <span className="ml-auto text-sm text-gray-600">
          Selected: <span className="font-semibold text-gray-800">{selectedRows.size}</span> / {mappedDrawings.length}
        </span>
      </div>

      {/* Log checkboxes */}
      <div className="flex flex-wrap items-center gap-4 text-sm mt-2 mb-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" onChange={e => e.target.checked ? generateLogName('transmittal') : clearLogName('transmittal')} />
          Transmittal Log
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" onChange={e => e.target.checked ? generateLogName('submittal') : clearLogName('submittal')} />
          Submittal Log
        </label>
      </div>

      {/* Drawing Table */}
      <div className="overflow-x-auto border rounded mb-6">
        <table className="w-full text-sm">
          <thead className="bg-cyan-800 text-white text-left">
            <tr>
              {tableHeaders.map((heading, i) => (
                <th key={i} className="p-2 sticky top-0 z-10 bg-cyan-800">
                  {i === 0 ? (
                    <div className="flex items-center justify-center">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        title="Select/Deselect all"
                        className="h-4 w-4 cursor-pointer accent-teal-700"
                      />
                    </div>
                  ) : (
                    heading
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mappedDrawings.map((drawing, index) => (
              <TableRow
                key={index} // Consider using a stable key if available, e.g., drawing.drawingNo
                drawing={drawing}
                index={index}
                isSelected={selectedRows.has(index)}
                isVoided={voidedRows.has(index)}
                onToggleSelection={toggleRowSelection}
                onViewAttachment={() => openModal(drawing)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-6">
        <button className="btn-primary" onClick={handleNextClick}>Next</button>
        <button className="btn-secondary" onClick={() => router.push("/dashboard/project/project/publish_drawings")}
        >Back To TL</button>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white border rounded-md w-[600px] p-4 shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs rounded-bl-md"
            >
              ✕
            </button>
            <table className="w-full border">
              <thead>
                <tr className="bg-cyan-800 text-white text-sm">
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedModalFiles.size === modalFiles.length && modalFiles.length > 0}
                      onChange={handleSelectAllModal}
                    />
                    <span className="ml-2 font-semibold">Select All</span>
                  </th>
                  <th className="p-2 text-left font-semibold">Name</th>
                  <th className="p-2 text-left font-semibold">Description</th>
                  <th className="p-2 text-left font-semibold">Remove</th>
                </tr>
              </thead>
              <tbody>
                {modalFiles.map((file, idx) => (
                  // Ensure file.name is stable for the key
                  <tr key={file.name || idx} className="border-t text-sm">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedModalFiles.has(file.name)}
                        onChange={() => handleModalCheckboxChange(file.name)}
                      />
                    </td>
                    <td className="p-2">{file.name}</td>
                    <td className="p-2">
                      {/* This textarea currently displays the filename, assuming it's for editing a description or comment */}
                      <textarea className="border w-full px-1 py-1 text-xs" value={file.name} readOnly />
                    </td>
                    <td
                      className="p-2 text-blue-600 cursor-pointer"
                      onClick={() => handleRemoveModalFile(file.name)}
                    >
                      Remove
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={handleDownloadSelected}
                className="bg-blue-700 text-white px-4 py-1 text-sm rounded"
              >
                Download
              </button>
              <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-1 text-sm rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoized TableRow component to prevent unnecessary re-renders
const TableRow = React.memo(({ drawing, index, isSelected, isVoided, onToggleSelection, onViewAttachment }) => (
  <tr className={`${isVoided ? 'bg-red-50' : ''} even:bg-gray-50`}>
    <td className="p-2 text-center">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelection(index)}
        className="h-4 w-4 accent-teal-700"
      />
    </td>
    <td className="p-2">
      {drawing.itemName} {/* Displaying Item Name here, not Item Name as per header */}
      {isVoided && (
        <span className=" px-2 py-0.5 rounded bg-red-400 text-white text-xs font-bold">
          [VOID]
        </span>
      )}
    </td>
    <td className="p-2">{drawing.drawingNo}</td>
    <td className="p-1">
      <input
        value={
          drawing.dateSentForApproval
            ? new Date(drawing.dateSentForApproval).toISOString().slice(0, 10)
            : ''
        }
        readOnly
      />
    </td>
    <td className="p-2">
      <input
        value={
          drawing.dateSentForFab
            ? new Date(drawing.dateSentForFab).toISOString().slice(0, 10)
            : ''
        }
        readOnly
      />
    </td>
    <td className="p-1">
      <input type="date" className="input" />
    </td>
    <td className="p-2 text-center">{drawing.rev}</td>
    <td className="p-2">{drawing.sheetSize}</td>
    <td className="p-2">{drawing.detailer}</td>
    <td className="p-2">{drawing.checker}</td>
    <td
      className="p-2 text-blue-600 text-center underline cursor-pointer"
      onClick={onViewAttachment}
    >
      View
    </td>
  </tr>
));

// Memoized UI Components
const InputField = React.memo(({ label, value, onChange, onUpdate, field, ...rest }) => (
  <div className='space-y-1'> {/* Changed from space-x-3 to space-y-1 for better vertical spacing */}
    <label className="block font-medium mb-1">{label}</label>
    <div className="flex gap-2"> {/* Added flex container for input and button */}
      <input
        type="text"
        className="input bg-gray-200 flex-grow" // Use flex-grow to take available space
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {onUpdate && ( // Conditionally render update button if handler is provided
        <button className="bg-teal-800 text-white px-4 py-2 rounded text-sm" type="button" onClick={onUpdate}>
          Update
        </button>
      )}
    </div>
  </div>
));

const ReadOnlyField = React.memo(({ label, value }) => (
  <div>
    <label className="block font-medium mb-1">{label}</label>
    <input type="text" className="input bg-gray-200" value={value} readOnly />
  </div>
));

const ReadOnlyUpdateField = React.memo(({ label, value, onUpdate }) => ( // Added onUpdate prop
  <div>
    <label className="block font-medium mb-1">{label}</label>
    <div className="flex gap-2">
      <input type="text" className="input bg-gray-200" value={value} readOnly />
    </div>
  </div>
));

const LabeledDateUpdate = React.memo(({ label, value, onChange, onUpdate }) => (
  <div>
    <label className="block font-medium mb-1">{label}</label>
    <div className="flex gap-2">
      <input
        type="date"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="btn-primary" type="button" onClick={onUpdate}>Update</button>
    </div>
  </div>
));

export default HybridPublishDrawings;