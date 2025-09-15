'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function FileTransferPanel() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [lastUploaded, setLastUploaded] = useState(null);

  useEffect(() => {
    // Fetch all clients from the client table
    fetch('/api/clients')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch clients');
        }
        return res.json();
      })
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error fetching clients:', err);
        setClients([]); // Ensure clients state is reset on error
      });
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      // Fetch users for the selected client
      fetch(`/api/users?clientId=${selectedClientId}`)
        .then((res) => res.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch((err) => console.error('Failed to load users', err));

      // Fetch projects for the selected client
      fetch(`/api/projects?clientId=${selectedClientId}`)
        .then((res) => res.json())
        .then((data) => setProjects(Array.isArray(data) ? data : []))
        .catch((err) => console.error('Failed to load projects', err));
    }
  }, [selectedClientId]);

  // derive current user's display name from fetched users (fallback to session email)
  const currentUserName = React.useMemo(() => {
    if (status === 'loading') return 'Loading...';
    if (!session?.user?.email) return '';
    return session.user.email;
  }, [session, status]);

  return (
    <div className="border p-4 w-full max-w-full overflow-x-auto">
      <div className="flex flex-wrap justify-between gap-6">
        {/* Client Selection */}
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

        {/* User Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">User:</label>
          <select
            className="ml-0 border border-gray-400 rounded px-2 py-1"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={!selectedClientId}
          >
            <option value="">Select User</option>
            {users
              .filter((u) => (u.userType || '').toString().toLowerCase() === 'client')
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
        </div>

        {/* Project Selection */}
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

        {/* File Upload */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">File:</label>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="border border-gray-400 px-2 py-1 text-red-600"
          />

          <button
            disabled={!selectedFile || !selectedClientId || !selectedUserId || !selectedProjectId || loading}
            onClick={async () => {
              if (!selectedFile || !selectedClientId || !selectedUserId || !selectedProjectId) return;
              setLoading(true);
              setResultMsg('');
              try {
                const fd = new FormData();
                fd.append('file', selectedFile);
                fd.append('clientId', selectedClientId);
                fd.append('userId', selectedUserId);
                fd.append('projectId', selectedProjectId);

                const res = await fetch('/api/upload', {
                  method: 'POST',
                  body: fd,
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Upload failed');
                setResultMsg(`Uploaded: ${data.path || 'ok'}`);
                // store returned record (if any) so user can request a signed URL
                if (data.record) setLastUploaded(data.record);
               } catch (err) {
                 console.error('Upload error', err);
                 setResultMsg(err.message || String(err));
               } finally {
                 setLoading(false);
               }
            }}
            className="bg-teal-800 hover:bg-teal-700 text-white font-semibold py-1 px-4 rounded mt-1 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Send Files'}
          </button>

          {resultMsg && <div className="text-sm mt-2">{resultMsg}</div>}
          {lastUploaded && (
            <div className="mt-2">
              <button
                className="text-blue-600 underline"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/files/${lastUploaded.id}/url`);
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      alert(`Could not get download URL: ${err.error || res.statusText}`);
                      return;
                    }
                    const { url } = await res.json();
                    window.location.href = url;
                  } catch (e) {
                    console.error(e);
                    alert('Failed to fetch signed url');
                  }
                }}
              >
                Download uploaded file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
