"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";

const ViewFiles = () => {
  const [currentClientName, setCurrentClientName] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await fetch('/api/users/me', { cache: 'no-store' });
        if (me.ok) {
          const user = await me.json();
          const role = String(user?.userType || '').toLowerCase();
          const admin = role === 'admin';
          setIsAdmin(admin);
          if (!admin) {
            const client = user?.client;
            if (client?.id) {
              setCurrentClientName(client.name || '');
              await fetchFilesScoped({ clientId: client.id });
            } else {
              setFiles([]);
            }
          } else {
            // admin: fetch all files
            await fetchFilesScoped({});
          }
        } else {
          setFiles([]);
        }
      } catch (e) {
        console.error('bootstrap failed', e);
        setFiles([]);
      }
    };

    bootstrap();
  }, []);

  const fetchFilesScoped = async ({ clientId, projectId } = {}) => {
    setLoading(true);
    try {
      // Build URL; clientId is optional now (server scopes by session)
      const params = new URLSearchParams();
      if (clientId != null) params.set('clientId', String(clientId));
      if (projectId != null) params.set('projectId', String(projectId));
      const url = `/api/files${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching files:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-files-page flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-4">View Files</h1>

          {/* Header context: show which client user is seeing; admin sees all files */}
          <div className="mb-4">
            {isAdmin ? (
              <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50">Showing all uploads (Admin)</div>
            ) : (
              <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50">{currentClientName || 'Uploads'}</div>
            )}
          </div>

          {loading && <p className="text-gray-500">Loading files...</p>}

          {!loading && files.length > 0 && (
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    File Name
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Uploaded At
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      {file.fileName}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(file.uploadedAt || file.createdAt).toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={async () => {
                          try {
                            // If storagePath is an object path (no scheme), call signed-url endpoint
                            const isObjectPath = !file.storagePath.startsWith("http");
                            if (isObjectPath) {
                              const res = await fetch(`/api/files/${file.id}/url`);
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                alert(`Could not get download URL: ${err.error || res.statusText}`);
                                return;
                              }
                              const { url } = await res.json();
                              window.location.href = url;
                              return;
                            }

                            // Fallback: transform cloud.google.com to storage.googleapis.com for public links
                            const publicUrl = file.storagePath.replace('https://storage.cloud.google.com/', 'https://storage.googleapis.com/');
                            window.location.href = publicUrl;
                          } catch (err) {
                            console.error('Download error', err);
                            alert('Failed to start download');
                          }
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && files.length === 0 && (
            <p className="text-gray-500">
              No files found.
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ViewFiles;
