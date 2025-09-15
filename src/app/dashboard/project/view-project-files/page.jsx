"use client";

import React, { useEffect, useState } from "react";

import TableComponent from "@/app/components/Table";
import SearchFilter from "@/app/components/SearchFilter";

const ViewProjectFiles = () => {
  const [documentLogs, setDocumentLogs] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    fetch("/api/document-logs")
      .then((res) => res.json())
      .then((data) => {
        const clientUploads = (Array.isArray(data) ? data : []).filter(doc => doc.logType === 'CLIENT_UPLOAD');
        setDocumentLogs(clientUploads);
        setFilteredData(clientUploads);
      })
      .catch((err) => console.error("Failed to load document logs", err));
  }, []);


  // Download handler for signed URL
  const handleDownload = async (row) => {
    if (!row?.storagePath) return;
    try {
      const res = await fetch(`/api/gcs-signed-url?path=${encodeURIComponent(row.storagePath)}`);
      const data = await res.json();
      if (data.url) {
        // Navigate to the signed URL (CORS-safe)
        window.location.href = data.url;
      } else {
        alert('Failed to get download link');
      }
    } catch (e) {
      alert('Error fetching download link');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">View Project Files</h1>
      <SearchFilter
        data={documentLogs}
        searchFields={["fileName", "uploadedAt", "clientId", "projectId", "size"]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={["File Name", "Uploaded At", "Client ID", "Project ID", "Size", "Download"]}
        keys={["fileName", "uploadedAt", "clientId", "projectId", "size"]}
        data={filteredData}
        showActions={false}
        customColumns={[{
          header: 'Download',
          render: (row) => (
            <button
              className="text-blue-600 underline hover:text-blue-800"
              onClick={() => handleDownload(row)}
            >
              Download
            </button>
          )
        }]}
      />
    </div>
  );
};

export default ViewProjectFiles;
