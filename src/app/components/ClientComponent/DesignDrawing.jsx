"use client";

import React, { useState, useEffect } from 'react';
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';
import { useRouter } from 'next/navigation';

const DesignDrawing = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [me, setMe] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const router = useRouter();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file to upload.');
      return;
    }
    if (!projectId) {
      setUploadStatus('Please select a project.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('projectId', projectId);

    try {
      const headers = {};
      if (me && me.email) headers['x-user-email'] = me.email;

      const response = await fetch('/api/upload-design-drawing', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus(`File uploaded successfully: ${data.record?.storagePath || ''}`);
      } else {
        const errorData = await response.json();
        setUploadStatus(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      setUploadStatus(`An error occurred: ${error.message}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) return;
        const user = await res.json();
        if (mounted) setMe(user);
        // Fetch projects for this client
        if (user && user.clientId) {
          const projectsRes = await fetch(`/api/projects?clientId=${user.clientId}`);
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            if (mounted) setProjects(projectsData);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch current user or projects', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="design-drawing-page">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-4">
          <SearchFilter />
          <div className="mb-2">
            <label className="mr-2">Project:</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="border px-2 py-1">
              <option value="">Select a project</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name || `Project #${proj.id}`}</option>
              ))}
            </select>
          </div>
          <h1>Upload Design Drawing</h1>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
          {uploadStatus && <p>{uploadStatus}</p>}
          <TableComponent />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DesignDrawing;
