'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { uploadToGCSDirect } from '@/lib/uploadToGCS';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

export default function FileTransferPanel({ logType = undefined }) {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [lastUploaded, setLastUploaded] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Email integration
  const [sendEmail, setSendEmail] = useState(false);
  const [toEmails, setToEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  const { data: swrClients } = useSWR('/api/clients');
  useEffect(() => {
    setClients(Array.isArray(swrClients) ? swrClients : []);
  }, [swrClients]);

  const { data: swrProjects } = useSWR(() => selectedClientId ? `/api/projects?clientId=${selectedClientId}` : null);
  const { data: swrPackages } = useSWR(() => selectedProjectId ? `/api/packages?projectId=${selectedProjectId}` : null);
  useEffect(() => {
    if (!selectedClientId) { setProjects([]); return; }
    setProjects(Array.isArray(swrProjects) ? swrProjects : []);
  }, [swrProjects, selectedClientId]);
  useEffect(() => {
    if (!selectedProjectId) { setPackages([]); return; }
    setPackages(Array.isArray(swrPackages) ? swrPackages : []);
  }, [swrPackages, selectedProjectId]);

  const currentUserEmail = useMemo(() => {
    if (status === 'loading') return '';
    return (session && session.user && session.user.email) || '';
  }, [session, status]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => String(c.id) === String(selectedClientId)) || null;
  }, [clients, selectedClientId]);

  async function handleUpload() {
    if (!selectedFile) return setResultMsg('Select a file.');
    if (!selectedClientId) return setResultMsg('Select a client.');
    if (!selectedProjectId) return setResultMsg('Select a project.');
    if (!selectedPackageId) return setResultMsg('Select a package.');
    if (sendEmail && !String(toEmails || '').trim()) {
      return setResultMsg('Enter recipient email(s) or uncheck "Send email".');
    }

    setLoading(true);
    setResultMsg('');
    setLastUploaded(null);
    setUploadProgress(0);
    setEmailStatus(null);

    try {
      const { record } = await uploadToGCSDirect(selectedFile, {
        clientId: Number(selectedClientId),
        projectId: Number(selectedProjectId),
        packageId: Number(selectedPackageId),
        logType,
        onProgress: setUploadProgress,
      });
      setLoading(false);
      setResultMsg('Uploaded');
      setLastUploaded(record || null);

      // Optional: send email with signed link
      if (sendEmail) {
        try {
          const storagePath = record?.storagePath || record?.path || record?.objectPath;
          let signedUrl = undefined;
          if (storagePath) {
            const urlRes = await fetch('/api/gcs/signed-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: storagePath, action: 'read', expiresSeconds: 600 })
            });
            const urlJson = await urlRes.json().catch(() => ({}));
            if (urlRes.ok && urlJson?.url) signedUrl = urlJson.url;
          }

          const recipients = String(toEmails || '').trim();
          const subject = emailSubject?.trim() || `New file uploaded: ${selectedFile.name}`;
          const linkLine = signedUrl ? `\n\nDownload link (valid for 10 minutes):\n${signedUrl}` : '';
          const text = `${emailBody?.trim() || 'A new file has been uploaded.'}${linkLine}`;

          const resp = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: recipients, subject, text })
          });
          const respJson = await resp.json().catch(() => ({}));
          if (resp.ok && (respJson?.sent === true)) {
            const count = Number(respJson?.to ?? 0) || recipients.split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
            setEmailStatus({ ok: true, message: `Email sent to ${count} recipient(s).` });
          } else {
            const errMsg = respJson?.error || resp.statusText || 'Unknown error';
            setEmailStatus({ ok: false, message: `Failed to send email: ${errMsg}` });
          }
        } catch (e) {
          setEmailStatus({ ok: false, message: e?.message || 'Failed to send email' });
        }
      }
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

          {/* Selected client details */}
          {selectedClient && (
            <div className="mt-2 text-xs text-gray-800 border rounded p-2 bg-gray-50 max-w-xs">
              {selectedClient.companyName && (
                <div><span className="font-semibold">Company:</span> {selectedClient.companyName}</div>
              )}
              {selectedClient.email && (
                <div><span className="font-semibold">Email:</span> {selectedClient.email}</div>
              )}
              {selectedClient.contactNo && (
                <div><span className="font-semibold">Contact No:</span> {selectedClient.contactNo}</div>
              )}
              {selectedClient.address && (
                <div><span className="font-semibold">Address:</span> {selectedClient.address}</div>
              )}
              {(selectedClient.computedTotalProjects != null || selectedClient.computedActiveProjects != null || selectedClient.computedCompletedProjects != null) && (
                <div className="mt-1 text-[11px] text-gray-600">
                  <div>Projects — Total: {selectedClient.computedTotalProjects ?? 0}, Active: {selectedClient.computedActiveProjects ?? 0}, Completed: {selectedClient.computedCompletedProjects ?? 0}</div>
                </div>
              )}
            </div>
          )}
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

        {/* Package */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-black">Package:</label>
          <select
            className="ml-0 border border-gray-400 rounded px-2 py-1"
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            disabled={!selectedProjectId}
          >
            <option value="">Select Package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name || pkg.packageNumber || `#${pkg.id}`}
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
            disabled={!selectedFile || !selectedClientId || !selectedProjectId || !selectedPackageId || loading}
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

      {/* Optional email section integrated with send */}
      <div className="mt-4 border-t pt-4">
        <label className="inline-flex items-center gap-2 text-black">
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
          <span className="font-semibold">Send email notification</span>
        </label>

        {sendEmail && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="md:col-span-1">
              <label className="text-sm">Recipients (comma/semicolon separated):</label>
              <input
                value={toEmails}
                onChange={(e) => setToEmails(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="email1@example.com; email2@example.com"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm">Subject</label>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border p-2 rounded"
                  placeholder={`New file uploaded: ${selectedFile?.name || ''}`}
                />
              </div>
              <div>
                <label className="text-sm">Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full border p-2 rounded min-h-[100px]"
                  placeholder="Write your email message here... (a download link will be appended)"
                />
              </div>
            </div>
            {emailStatus && (
              <div className={`md:col-span-3 text-sm ${emailStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                {emailStatus.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
