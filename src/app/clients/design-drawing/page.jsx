"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";

const DesignDrawingPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentClientName, setCurrentClientName] = useState("");
  const [me, setMe] = useState(null);
  const [uploadJobId, setUploadJobId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const pollJobStatus = async (jobId) => {
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          const job = data.job;
          
          if (job.status === 'succeeded') {
            clearInterval(pollInterval);
            setIsPolling(false);
            const result = job.result || {};
            setUploadStatus(`✅ Upload completed successfully: ${result.fileName || selectedFile.name}`);
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setIsPolling(false);
            setUploadStatus(`❌ Upload failed: ${job.error || 'Unknown error'}`);
          } else {
            setUploadStatus(`🔄 Processing upload... Status: ${job.status} (${job.progress || 0}%)`);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isPolling) {
        setIsPolling(false);
        setUploadStatus('⏱️ Upload taking longer than expected. Check back later.');
      }
    }, 300000);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Please select a file to upload.");
      return;
    }

    if (!selectedProjectId) {
      setUploadStatus("Please select a project.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append('projectId', selectedProjectId);

    try {
      // ensure we have user info to send as header
      let current = me;
      if (!current) {
        try {
          const r = await fetch('/api/users/me');
          if (r.ok) current = await r.json();
          setMe(current || null);
        } catch (e) {
          console.warn('Could not fetch current user before upload', e);
        }
      }

      if (!current || !current.email) {
        setUploadStatus('Upload failed: could not identify current user.');
        return;
      }

      const headers = { 'x-user-email': current.email };
      setUploadStatus("🚀 Enqueueing upload job...");

      const response = await fetch("/api/upload-design-drawing", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobId) {
          setUploadJobId(data.jobId);
          setUploadStatus(`📋 Upload job created (ID: ${data.jobId}). Processing...`);
          pollJobStatus(data.jobId);
        } else {
          setUploadStatus(`✅ ${data.message || 'Upload completed'}`);
        }
      } else {
        const errorData = await response.json();
        setUploadStatus(`❌ Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      setUploadStatus(`❌ An error occurred: ${error.message}`);
    }
  };

  // on mount: if logged-in user is a client, fetch their projects
  useEffect(() => {
    const init = async () => {
      try {
  const meRes = await fetch('/api/users/me');
  if (!meRes.ok) return;
  const me = await meRes.json();
  setMe(me);
        if (me && me.userType && me.userType.toLowerCase() === 'client' && me.client && me.client.id) {
          const clientId = me.client.id;
          setCurrentClientName(me.client.name || '');
          // fetch projects for client
          try {
            const pr = await fetch(`/api/projects?clientId=${clientId}`);
            if (!pr.ok) return;
            const projData = await pr.json();
            setProjects(Array.isArray(projData) ? projData : []);
            if (Array.isArray(projData) && projData.length > 0) {
              setSelectedProjectId(String(projData[0].id));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    };
    init();
  }, []);

  return (
    <div className="design-drawing-page flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-4">
          <h1 className="text-2xl font-bold mb-4">Design Drawing Upload</h1>
          <input
            type="file"
            onChange={handleFileChange}
            className="border border-gray-300 rounded px-3 py-2 mb-4"
          />
          {/* Show client name if available */}
          {currentClientName && (
            <div className="mb-3 text-sm text-gray-700">Client: {currentClientName}</div>
          )}

          {/* Project selection for client users */}
          {projects && projects.length > 0 ? (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full mb-2"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            currentClientName && (
              <div className="mb-4 text-sm text-gray-500">No projects available for this client.</div>
            )
          )}
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Upload
          </button>
          {uploadStatus && <p className="mt-4 text-gray-700">{uploadStatus}</p>}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DesignDrawingPage;
