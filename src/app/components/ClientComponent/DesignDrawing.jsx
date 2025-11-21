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
  const [uploadJobId, setUploadJobId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const router = useRouter();

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
      setUploadStatus('🚀 Enqueueing upload job...');

      const response = await fetch('/api/upload-design-drawing', {
        method: 'POST',
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
