'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaFolder, FaFileArchive, FaFileAlt, FaTimes } from 'react-icons/fa';
import useClientStore from '../../../../stores/clientStore';

const FolderStructure = () => {
  const folderStructure = useClientStore((state) => state.folderStructure);
  const setFolderStructure = useClientStore((state) => state.setFolderStructure);

  const [mainZip, setMainZip] = useState('');
  const [sections, setSections] = useState([]);
  const hasMounted = useRef(false);

  const defaultFileDetails = {
    category: '',
    size: 'A1',
    extension: 'pdf',
    electronicName: 'All',
  };

  // Load Zustand data on mount or when resetForm is called
 // Load existing Zustand data only once on mount
   useEffect(() => {
    if (folderStructure?.mainZip || folderStructure?.sections?.length) {
      setMainZip(folderStructure.mainZip || '');
      setSections(folderStructure.sections || []);
    }
    hasMounted.current = true;
  }, []);

  useEffect(() => {
    if (hasMounted.current) {
      const isChanged =
        folderStructure.mainZip !== mainZip ||
        JSON.stringify(folderStructure.sections) !== JSON.stringify(sections);

      if (isChanged) {
        setFolderStructure({ mainZip, sections });
      }
    }
  }, [mainZip, sections]);

  const addSection = (type) => {
    setSections((prev) => [
      ...prev,
      {
        type,
        name: '',
        fileType: 'Uploaded',
        fileDetails: { ...defaultFileDetails },
      },
    ]);
  };

  const updateSection = (index, key, value) => {
    setSections((prev) =>
      prev.map((section, i) =>
        i === index ? { ...section, [key]: value } : section
      )
    );
  };

  const updateFileDetail = (index, field, value) => {
    setSections((prev) =>
      prev.map((section, i) =>
        i === index
          ? {
              ...section,
              fileDetails: {
                ...section.fileDetails,
                [field]: value,
              },
            }
          : section
      )
    );
  };

  const removeSection = (index) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-4 text-sm">
      {/* MAIN ZIP */}
      <div className="flex items-center space-x-4">
        <label className="font-semibold whitespace-nowrap">MAIN ZIP</label>
        <input
          value={mainZip}
          onChange={(e) => setMainZip(e.target.value)}
          className="border rounded px-3 py-1 w-60"
          placeholder="Enter main ZIP name"
        />
        <div className="space-x-2">
          <button onClick={() => addSection('folder')} className="bg-yellow-100 px-2 py-1 border rounded text-xs">Add Folder</button>
          <button onClick={() => addSection('zip')} className="bg-blue-100 px-2 py-1 border rounded text-xs">Add Zip</button>
          <button onClick={() => addSection('file')} className="bg-green-100 px-2 py-1 border rounded text-xs">Add File</button>
        </div>
      </div>

      {/* SECTION RENDER */}
      {sections.map((section, index) => (
        <div key={index} className="ml-8 space-y-2">
          {(section.type === 'folder' || section.type === 'zip') && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {section.type === 'folder' ? (
                  <FaFolder className="text-yellow-500" />
                ) : (
                  <FaFileArchive className="text-blue-500" />
                )}
                <label className="font-semibold">{section.type.toUpperCase()}</label>
                <input
                  value={section.name}
                  onChange={(e) => updateSection(index, 'name', e.target.value)}
                  className="border rounded px-2 py-1 w-48"
                  placeholder={`Enter ${section.type} name`}
                />
                <button onClick={() => removeSection(index)} className="text-red-600">
                  <FaTimes />
                </button>
              </div>
              <div className="ml-6 space-x-2">
                <button onClick={() => addSection('folder')} className="bg-yellow-100 px-2 py-1 border rounded text-xs">Add Folder</button>
                <button onClick={() => addSection('zip')} className="bg-blue-100 px-2 py-1 border rounded text-xs">Add Zip</button>
                <button onClick={() => addSection('file')} className="bg-green-100 px-2 py-1 border rounded text-xs">Add File</button>
              </div>
            </div>
          )}

          {section.type === 'file' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FaFileAlt className="text-green-500" />
                <label className="font-semibold">ADD FILES</label>
                <button onClick={() => removeSection(index)} className="text-red-600">
                  <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-2">
                <label>Item Category</label>
                <select
                  className="border rounded px-2 py-1"
                  value={section.fileDetails.category}
                  onChange={(e) => updateFileDetail(index, 'category', e.target.value)}
                >
                  <option value="">Item Category</option>
                  <option value="Anchor Bolt">ANCHOR BOLT & ERECTION DRAWINGS</option>
                  <option value="Fabrication">FABRICATION DRAWINGS</option>
                </select>

                <label>Size</label>
                <select
                  className="border rounded px-2 py-1"
                  value={section.fileDetails.size}
                  onChange={(e) => updateFileDetail(index, 'size', e.target.value)}
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                </select>

                <label>Extension</label>
                <select
                  className="border rounded px-2 py-1"
                  value={section.fileDetails.extension}
                  onChange={(e) => updateFileDetail(index, 'extension', e.target.value)}
                >
                  <option value="pdf">pdf</option>
                  <option value="docx">docx</option>
                  <option value="xlsx">xlsx</option>
                </select>

                <label>Electronic Name</label>
                <select
                  className="border rounded px-2 py-1"
                  value={section.fileDetails.electronicName}
                  onChange={(e) => updateFileDetail(index, 'electronicName', e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Drawing">Drawing</option>
                  <option value="Report">Report</option>
                </select>
              </div>

              <div className="flex items-center gap-6 mt-2">
                {['Uploaded', 'Extra', 'Others'].map((label) => (
                  <label key={label} className="flex items-center space-x-1">
                    <input
                      type="radio"
                      name={`fileType-${index}`} // isolate by index
                      value={label}
                      checked={section.fileType === label}
                      onChange={(e) => updateSection(index, 'fileType', e.target.value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FolderStructure;
