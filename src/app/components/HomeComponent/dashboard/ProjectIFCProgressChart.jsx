'use client';
import Link from 'next/link';
import React from 'react';

const ProjectIFCProgressChart = () => {
  const ifcData = [
    { category: 'ANCHOR', total: 0, released: 0 },
    { category: 'EMBED', total: 0, released: 0 },
    { category: 'STEEL', total: 0, released: 0 },
    { category: 'STAIR', total: 0, released: 0 },
    { category: 'MISC.', total: 0, released: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-[#32798d] text-white text-lg font-semibold rounded-t-md px-4 py-2 flex justify-between items-center">
        <Link href="/dashboard/home/dashboard">
        <button className="bg-white text-[#32798d] px-3 py-1 rounded text-sm font-medium">Back To Dashboard</button>
        </Link>        
        <h1 className="text-white text-center w-full mr-12">Project IFC Progress Chart</h1>
      </div>

      {/* Project Info */}
      <div className="bg-white shadow rounded-b-md p-4 mb-6">
        <h2 className="text-md font-semibold border-b pb-2 mb-3">Project Information</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex">
            <span className="font-bold w-40">Project Name:</span>
            <span>Custom Residence- 5823 N Inv</span>
          </div>
          <div className="flex">
            <span className="font-bold w-40">SOL Project No:</span>
            <span>2025227</span>
          </div>
          <div className="flex">
            <span className="font-bold w-48">SOL PM/TL Name:</span>
            <span>LD Sharma</span>
          </div>
          <div className="flex">
            <span className="font-bold w-40">Fabricator Name:</span>
            <span>BG Steel</span>
          </div>
          <div className="flex">
            <span className="font-bold w-40">Fabricator Job No:</span>
            <span>25-020</span>
          </div>
          <div className="flex">
            <span className="font-bold w-48">Fabricator PM Name:</span>
            <span>Brent Goodman</span>
          </div>
        </div>
      </div>

      {/* IFC Progress Summary */}
      <div className="bg-white shadow rounded-md p-4">
        <h2 className="text-md font-semibold border-b pb-2 mb-3">UpToDate IFC Progress Summary</h2>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mock Graph */}
          <div className="flex-1 bg-white shadow rounded-md p-4">
            <h3 className="text-center text-gray-600 text-sm mb-2">Project IFC Graph in Percentage(%)</h3>
            <div className="w-full h-64 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-gray-400">
              (Graph Placeholder)
            </div>
          </div>

          {/* Table */}
          <div className="flex-1">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-[#2574a9] text-white text-left">
                  <th className="py-2 px-3">IFC Category</th>
                  <th className="py-2 px-3">Total Sheets</th>
                  <th className="py-2 px-3">Released Sheets</th>
                </tr>
              </thead>
              <tbody>
                {ifcData.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 px-3">{item.category}</td>
                    <td className="py-2 px-3">{item.total}</td>
                    <td className="py-2 px-3">{item.released}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectIFCProgressChart;
