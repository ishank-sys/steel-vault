'use client';

import { useState, useEffect } from 'react';
import FileTransferPanel from './FileTransferPanel';
import MailForm from './MailForm';
import SearchFilter from '../SearchFilter';
import TableComponent from '../Table';

export default function DocumentTable() {
  const [documentLogs, setDocumentLogs] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    // Fetch document logs from the backend
    fetch('/api/document-logs')
      .then((res) => res.json())
      .then((data) => {
        setDocumentLogs(Array.isArray(data) ? data : []);
        setFilteredData(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Failed to load document logs', err));
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex justify-center mb-2">
        <FileTransferPanel />
      </div>
      <div className="flex justify-center mb-2">
        <MailForm />
      </div>

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
          showActions={true}
          onEdit={(row) => console.log('Edit:', row)}
          onDelete={(row) => console.log('Delete:', row)}
        />
      </div>
    </div>
  );
}
