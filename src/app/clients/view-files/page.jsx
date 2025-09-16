"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";

const ViewFiles = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [currentClientName, setCurrentClientName] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch(`/api/clients`);
        const data = await res.json();
        setClients(data);

        // determine if logged-in user is a client and auto-select their client
        try {
          const me = await fetch('/api/users/me');
          if (me.ok) {
            const user = await me.json();
            if (user && user.userType && user.userType.toLowerCase() === 'client') {
              const client = user.client;
              if (client && client.id) {
                setSelectedClientId(String(client.id));
                setCurrentClientName(client.name || '');
                // Fetch projects and show dropdown for client user
                const resProj = await fetch(`/api/projects?clientId=${client.id}`);
                const dataProj = await resProj.json();
                setProjects(Array.isArray(dataProj) ? dataProj : []);
                // Optionally auto-select first project and fetch files for it
                if (Array.isArray(dataProj) && dataProj.length > 0) {
                  setSelectedProjectId(""); // or setSelectedProjectId(dataProj[0].id) to auto-select first
                  setFiles([]);
                } else {
                  setSelectedProjectId("");
                  setFiles([]);
                }
              }
            }
          }
        } catch (e) {
          // ignore me fetch errors
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };

    fetchClients();
  }, []);

  // Fetch projects for a client
  const fetchProjects = async (clientId) => {
    setProjects([]);
    setSelectedProjectId("");
    setFiles([]);
    if (!clientId) return;
    try {
      const res = await fetch(`/api/projects?clientId=${clientId}`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects([]);
    }
  };

  const fetchFiles = async (clientId, projectId) => {
    setLoading(true);
    try {
      let url = `/api/files?clientId=${clientId}`;
      if (projectId) {
        // Find the project name from the projects array
        const project = projects.find((p) => String(p.id) === String(projectId));
        if (project && project.name) {
          url += `&projectName=${encodeURIComponent(project.name)}`;
        }
      }
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

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    setProjects([]);
    setFiles([]);
    if (clientId) {
      fetchProjects(clientId);
    } else {
      setProjects([]);
      setFiles([]);
    }
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    if (selectedClientId && projectId) {
      fetchFiles(selectedClientId, projectId);
    } else if (selectedClientId) {
      fetchFiles(selectedClientId);
    } else {
      setFiles([]);
    }
  };

  return (
    <div className="view-files-page flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-4">View Files</h1>

          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">Client:</label>
            {/* If currentClientName is set (user is a client), show read-only name; otherwise show dropdown */}
            {currentClientName ? (
              <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50">{currentClientName}</div>
            ) : (
              <select
                id="client-select"
                value={selectedClientId}
                onChange={handleClientChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              >
                <option value="">-- Select a Client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Project dropdown, only show if projects exist */}
          {projects.length > 0 && (
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Project:</label>
              <select
                id="project-select"
                value={selectedProjectId}
                onChange={handleProjectChange}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              >
                <option value="">-- Select a Project --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {!loading && files.length === 0 && selectedClientId && (
            <p className="text-gray-500">
              No files found for the selected client{selectedProjectId ? ' and project' : ''}.
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ViewFiles;
