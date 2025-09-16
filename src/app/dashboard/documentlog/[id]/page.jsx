"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TableComponent from "@/app/components/Table";

export default function DocumentLogPage() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/document-logs");
        const data = await res.json();
        // Filter logs for this project id
        const filteredLogs = (Array.isArray(data) ? data : []).filter(
          (log) => String(log.projectId) === String(id)
        );
        setLogs(filteredLogs);
        setFiltered(filteredLogs);
      } catch (e) {
        setLogs([]);
        setFiltered([]);
      }
    }
    if (id) fetchLogs();
  }, [id]);

  const headers = [
    "File Name",
    "Log Type",
    "Uploaded At",
    "Size (bytes)",
    "Download"
  ];
  const keys = [
    "fileName",
    "logType",
    "uploadedAt",
    "size"
  ];

  // Download handler: fetch signed URL and trigger download
  const handleDownload = async (row) => {
    if (!row.storagePath) return;
    try {
      const res = await fetch(`/api/gcs-signed-url?path=${encodeURIComponent(row.storagePath)}`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = row.fileName || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert('Failed to get download link.');
      }
    } catch (e) {
      alert('Download failed.');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Document Log for Project {id}</h2>
      <TableComponent
        headers={headers}
        keys={keys}
        data={filtered}
        customColumns={[
          {
            header: '',
            render: (row) => (
              row.storagePath ? (
                <button
                  onClick={() => handleDownload(row)}
                  className="text-blue-600 underline"
                >
                  Download
                </button>
              ) : '-'
            ),
          },
        ]}
      />
    </div>
  );
}
