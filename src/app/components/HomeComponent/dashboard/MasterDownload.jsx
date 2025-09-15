'use client';
import React from 'react';
import Link from 'next/link';

const downloadTiles = [
  { label: 'Design Drawing', path: '/projectdatafolder/design-drawing' },
  { label: 'Red Lines', path: 'red-lines' },
  { label: 'Drawings For Approval', path: 'drawings-approval' },
  { label: 'Drawings For Fab', path: 'drawings-fab' },
  { label: 'All NC1 Files', path: 'nc1-files' },
  { label: 'All DXF Files', path: 'dxf-files' },
  { label: 'All EJE Files', path: 'eje-files' },
  { label: 'All KSS Files', path: 'kss-files' },
  { label: 'FabSuite/FabTrol', path: 'fabsuite' },
  { label: '3D Model', path: 'model-3d' },
  { label: 'QC Logs', path: 'qc-logs' },
  { label: 'Field Bolt Summary', path: 'field-bolt-summary' },
  { label: 'Advance Material List', path: 'advance-material-list' },
  { label: 'Drawing Transmittal Log', path: 'drawing-transmittal-log' },
  { label: 'Complete Drawing Log', path: 'complete-drawing-log' },
  { label: 'Project Status Report', path: 'project-status-report' },
  { label: 'Extra Hours Log', path: 'extra-hours-log' },
  { label: 'Project Pictures and Videos', path: 'project-media' },
  { label: 'Other Files', path: 'other-files' },
  { label: 'Submission', path: 'submission' },
  { label: 'HoldItemList', path: 'hold-item-list' },
  { label: 'VoidItemList', path: 'void-item-list' },
];

const MasterDownload = () => {
  return (
    <div className="bg-[#e6f0f5] min-h-screen p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#24687A] text-white px-4 py-2 rounded">
      <Link href="/dashboard/home/dashboard">
        <button className="bg-white text-[#24687A] px-3 py-1 rounded text-sm">&lt; Back</button>
      </Link>
      <div className="text-center text-sm">
          <span className="font-semibold">Master Download</span><br />
          <span className="text-xs">(Download all project documents)</span>
        </div>
        <div className="text-sm">Start Date: <span className="font-bold">06-05-2025</span></div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <label className="font-semibold">Project Name:</label>
          <input
            type="text"
            value="Custom Residence- 5623 N"
            className="bg-[#24687A] text-white px-2 py-1 rounded w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="font-semibold">Project No:</label>
          <input
            type="text"
            value="2025227"
            className="bg-[#24687A] text-white px-2 py-1 rounded w-full"
          />
        </div>
        <div></div>
      </div>

      {/* Tile Grid */}
      <div className="grid grid-cols-4 gap-3 mt-6">
        {downloadTiles.map((tile, index) => (
          <Link
            key={index}
            href={`/dashboard/home/dashboard/${tile.path}`}
            className={`text-center py-6 font-semibold rounded shadow ${
              index % 2 === 0 ? 'bg-[#006ba1] text-white' : 'bg-[#bcd6f1] text-black'
            } hover:scale-105 transition`}
          >
            {tile.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MasterDownload;
