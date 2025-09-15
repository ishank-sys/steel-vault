'use client';

import { useState, useEffect } from 'react';
import FileTransferPanel from '../../components/HomeComponent/FileTransferPanel';
import Navbar from '../../components/navbar';
import Sidebar from '../../components/sidebar';
import Footer from '../../components/footer';

export default function UploadDesignDrawing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 w-full max-w-7xl mx-auto p-4">
          <div className="flex justify-center mb-2">
            <FileTransferPanel />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
