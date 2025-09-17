'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { uploadToGCSDirect } from '@/lib/uploadToGCS';
import { useSession } from 'next-auth/react';

export default function FileTransferPanel() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [lastUploaded, setLastUploaded] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    fetch(`/api/users?clientId=${selectedClientId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));

    fetch(`/api/projects?clientId=${selectedClientId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, [selectedClientId]);

  const currentUserEmail = useMemo(() => {
    if (status === 'loading') return '';
    return (session && session.user && session.user.email) || '';
  }, [session, status]);

  async function handleUpload() {
    if (!selectedFile) return setResultMsg('Select a file.');
    if (!selectedClientId) return setResultMsg('Select a client.');
    if (!selectedProjectId) return setResultMsg('Select a project.');

    setLoading(true);
    setResultMsg('');
    setLastUploaded(null);
    setUploadProgress(0);

    try {
      const { record } = await uploadToGCSDirect(selectedFile, {
        clientId: Number(selectedClientId),
        projectId: Number(selectedProjectId),
        onProgress: setUploadProgress,
      });
      setLoading(false);
      setResultMsg('Uploaded');
      setLastUploaded(record || null);
    } catch (e) {
      setLoading(false);
      setResultMsg(e && e.message ? e.message : 'Unexpected error');
    }
  }

  return (
    <div className="border p-4 w-full max-w-full overflow-x-auto">
      <div className="flex flex-wrap justify-between gap-6">
        {/* Client */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">Client:</label>
          <select
            className="ml-0 border border-gray-400 rounded px-2 py-1"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* (Optional) Users list, read-only */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">Users:</label>
          <select className="ml-0 border border-gray-400 rounded px-2 py-1" disabled>
            <option value="">
              {users.length ? `${users.length} user(s)` : 'No users'}
            </option>
          </select>
        </div>

        {/* Project */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">Project:</label>
          <select
            className="ml-0 border border-gray-400 rounded px-2 py-1"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={!selectedClientId}
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* File & Upload */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">File:</label>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            className="border border-gray-400 px-2 py-1 text-red-600"
          />

          <button
            disabled={!selectedFile || !selectedClientId || !selectedProjectId || loading}
            onClick={handleUpload}
            className="bg-teal-800 hover:bg-teal-700 text-white font-semibold py-1 px-4 rounded mt-1 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Send Files'}
          </button>

          {/* Upload Progress Bar */}
          {loading && (
            <div className="w-full bg-gray-200 rounded h-3 mt-2">
              <div
                className="bg-blue-600 h-3 rounded"
                style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}
              ></div>
            </div>
          )}
          {loading && (
            <div className="text-xs text-gray-700 mt-1">{uploadProgress}%</div>
          )}

          {resultMsg && <div className="text-sm mt-2">{resultMsg}</div>}
          {lastUploaded && (
            <div className="mt-2 text-xs text-gray-700">
              Saved at: {lastUploaded.storagePath || lastUploaded.path || '—'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
