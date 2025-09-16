"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import TableComponent from "@/app/components/Table";
export default function DocumentLogPage() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState({}); // { [rowId]: percent }
  const progressTimeouts = useRef({});

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
  // Download with progress bar using XHR
  const handleDownload = async (row) => {
    if (!row.storagePath) return;
    setDownloadProgress((prev) => ({ ...prev, [row.id]: 0 }));
    try {
      const res = await fetch(`/api/gcs-signed-url?path=${encodeURIComponent(row.storagePath)}`);
      const data = await res.json();
      if (data.url) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', data.url, true);
        xhr.responseType = 'blob';
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            setDownloadProgress((prev) => ({ ...prev, [row.id]: Math.round((event.loaded / event.total) * 100) }));
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const url = window.URL.createObjectURL(xhr.response);
            const a = document.createElement('a');
            a.href = url;
            a.download = row.fileName || 'file';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            document.body.removeChild(a);
          } else {
            alert('Download failed.');
          }
          setDownloadProgress((prev) => ({ ...prev, [row.id]: undefined }));
        };
        xhr.onerror = () => {
          alert('Download failed.');
          setDownloadProgress((prev) => ({ ...prev, [row.id]: undefined }));
        };
        xhr.send();
      } else {
        alert('Failed to get download link.');
        setDownloadProgress((prev) => ({ ...prev, [row.id]: undefined }));
      }
    } catch (e) {
      alert('Download failed.');
      setDownloadProgress((prev) => ({ ...prev, [row.id]: undefined }));
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
                <div style={{ minWidth: 120 }}>
                  <button
                    onClick={() => handleDownload(row)}
                    className="text-blue-600 underline mr-2"
                    disabled={downloadProgress[row.id] !== undefined && downloadProgress[row.id] < 100}
                  >
                    {downloadProgress[row.id] !== undefined && downloadProgress[row.id] < 100 ? 'Downloading...' : 'Download'}
                  </button>
                  {downloadProgress[row.id] !== undefined && downloadProgress[row.id] < 100 && (
                    <div style={{ width: 100, display: 'inline-block', verticalAlign: 'middle' }}>
                      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: '100%' }}>
                        <div style={{ background: '#176993', height: 8, borderRadius: 4, width: `${downloadProgress[row.id]}%`, transition: 'width 0.2s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#176993', textAlign: 'right' }}>{downloadProgress[row.id]}%</div>
                    </div>
                  )}
                </div>
              ) : '-'
            ),
          },
        ]}
      />

    </div>
  );
}
