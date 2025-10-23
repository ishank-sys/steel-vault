"use client";

import React from 'react';
import useLoadingStore from '@/stores/loadingStore';

export default function GlobalLoadingOverlay() {
  const count = useLoadingStore((s) => s.count);
  const isLoading = count > 0;

  if (!isLoading) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/25">
      <div className="rounded-md bg-white shadow-md px-6 py-4 flex items-center gap-3 border">
        <svg className="animate-spin h-5 w-5 text-teal-700" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-sm font-medium text-gray-700">Loading...</span>
      </div>
    </div>
  );
}
