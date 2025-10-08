'use client';

import React from 'react';
import FileTransferPanel from '../../../components/HomeComponent/FileTransferPanel';

export default function AdminUploadPage() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex justify-center mb-2">
        <FileTransferPanel logType="ADMIN_UPLOAD" />
      </div>
    </div>
  );
}
