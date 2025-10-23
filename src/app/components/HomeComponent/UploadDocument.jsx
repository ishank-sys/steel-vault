'use client';

import { useState, useEffect } from 'react';
import FileTransferPanel from './FileTransferPanel';
import SearchFilter from '../SearchFilter';
import TableComponent from '../Table';
import React from 'react';
import { fetchWithLoading } from '@/lib/fetchWithLoading';

export default function DocumentTable() {
  const [documentLogs, setDocumentLogs] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toEmails, setToEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  useEffect(() => {
    // Fetch document logs from the backend
    fetchWithLoading('/api/document-logs')
      .then((res) => res.json())
      .then((data) => {
        setDocumentLogs(Array.isArray(data) ? data : []);
        setFilteredData(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to load document logs', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleSendEmail() {
    const recipients = String(toEmails || '').trim();
    if (!recipients) {
      setEmailStatus({ ok: false, message: 'Please enter at least one recipient.' });
      return;
    }
    setEmailStatus(null);
    try {
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject: emailSubject || undefined,
          text: emailBody || undefined,
        })
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

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex justify-center mb-2">
        <FileTransferPanel />
      </div>
      {/* Email is now integrated in FileTransferPanel (optional toggle there) */}

      <div className="p-6">
        <SearchFilter
          data={documentLogs}
          searchFields={[
            'fileName', 'uploadedAt', 'clientId', 'projectId', 'size'
          ]}
          onFilteredDataChange={setFilteredData}
        />
        <TableComponent
          headers={['File Name', 'Uploaded At', 'Client ID', 'Project ID', 'Size']}
          keys={['fileName', 'uploadedAt', 'clientId', 'projectId', 'size']}
          data={filteredData}
          loading={loading}
          emptyTimeoutMs={8000}
          showActions={false}
        />
      </div>
    </div>
  );
}
