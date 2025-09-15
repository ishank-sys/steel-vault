'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('Fetch error');
  return res.json();
}

const ProjectStatusReport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [me, proj] = await Promise.all([fetchJSON('/api/users/me'), fetchJSON('/api/projects')]);
        if (!mounted) return;
        setUser(me);

        // filter: if admin -> all, else only projects where solTLId === me.id
        const visible = (me.userType === 'admin' || me.userType === 'Admin')
          ? proj
          : proj.filter(p => p.solTL && p.solTL.id === me.id);

        setProjects(visible);
      } catch (err) {
        console.error(err);
        setError('Failed to load projects or user');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleUpload = () => {
    if (!file) return;

    setUploading(true);

    // Simulated upload
    setTimeout(() => {
      setUploadedFile({
        name: file.name,
        uploadedOn: new Date().toLocaleDateString(),
      });
      setUploading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-[#32798d] text-white text-lg font-semibold rounded-t-md px-4 py-2 flex justify-between items-center">
        <Link href="/dashboard/home/dashboard">
        <button className="bg-white text-[#32798d] px-3 py-1 rounded text-sm font-medium">Back To Dashboard</button>
        </Link>
        <h1 className="text-white text-center w-full mr-12">Welcome to Project Status Report (PSR)</h1>
      </div>

      {/* Project Info */}
      <div className="bg-white shadow rounded-b-md p-4 mb-6">
        <h2 className="text-md font-semibold border-b pb-2 mb-3">Project Information</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex">
            <span className="font-bold w-32">Project Name:</span>
            <span>Custom Residence- 5823 N Invergordon</span>
          </div>
          <div className="flex">
            <span className="font-bold w-24">Project No:</span>
            <span>2025227</span>
          </div>
          <div className="flex">
            <span className="font-bold w-24">SOL TL Name:</span>
            <span>LD Sharma</span>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white shadow rounded-md p-4 mb-6">
        <h2 className="text-md font-semibold border-b pb-2 mb-3">Upload PSR</h2>
        <input
          type="file"
          className="mb-3 border rounded px-3 py-2"
          onChange={handleFileChange}
        />
        {/* Upload progress */}
        {uploading && (
          <div className="h-4 bg-gray-300 rounded overflow-hidden mb-3">
            <div className="h-full bg-[#32798d] animate-pulse" style={{ width: '80%' }}></div>
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bg-[#32798d] text-white px-4 py-2 rounded hover:bg-[#286472] disabled:opacity-50"
        >
          Upload
        </button>
      </div>

      {/* Projects Table */}
      <div className="bg-white shadow rounded-md p-4">
        <h2 className="text-md font-semibold border-b pb-2 mb-3">Projects</h2>
        {loading ? (
          <div className="py-6 text-center">Loading projects...</div>
        ) : error ? (
          <div className="py-6 text-center text-red-600">{error}</div>
        ) : projects.length === 0 ? (
          <div className="py-6 text-center text-gray-600">No projects available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-[#2574a9] text-white text-left">
                  <th className="py-2 px-3">Project No</th>
                  <th className="py-2 px-3">Project Name</th>
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Project Type</th>
                  <th className="py-2 px-3">Job Name</th>
                  <th className="py-2 px-3">Weight (T)</th>
                  <th className="py-2 px-3">Latest Submission</th>
                  <th className="py-2 px-3">SOL TL</th>
                  <th className="py-2 px-3">Design Drawing</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="odd:bg-gray-50 even:bg-white">
                    <td className="py-2 px-3">{p.projectNo}</td>
                    <td className="py-2 px-3">{p.name}</td>
                    <td className="py-2 px-3">{p.client ? p.client.name : '—'}</td>
                    <td className="py-2 px-3">{p.projectType || '—'}</td>
                    <td className="py-2 px-3">{p.jobName || '—'}</td>
                    <td className="py-2 px-3">{p.weightTonnage || '—'}</td>
                    <td className="py-2 px-3">{p.latestSubmission ? new Date(p.latestSubmission).toLocaleDateString() : '—'}</td>
                    <td className="py-2 px-3">{p.solTL ? p.solTL.name : '—'}</td>
                    <td className="py-2 px-3">
                      {/* Placeholder for GCP download link - will configure later */}
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">Download (GCP)</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectStatusReport;
