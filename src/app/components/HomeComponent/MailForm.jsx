'use client';

import React from 'react';

export default function MailForm() {
  return (
    <div className="border border-gray-400 p-4 w-full max-w-5xl mx-auto bg-white">
      <div className="flex flex-wrap">
        {/* Left side: Subject & Text */}
        <div className="w-full md:w-2/3 pr-1">
          {/* Mail Subject */}
          <div className="flex items-start mb-4">
            <label className="text-sm font-semibold  text-black  mr-6">Mail Subject :</label>
            <textarea
              className="border border-gray-400 w-full resize-none h-10 px-2"
              rows="1"
            ></textarea>
          </div>

          {/* Mail Text */}
          <div className="flex items-start">
            <label className="w-28 font-bold text-sm text-black mt-2">Mail Text :</label>
            <textarea
              className="border border-gray-400 w-full resize-none h-16 px-2 py-1"
              rows="3"
            ></textarea>
          </div>
        </div>

        {/* Right side: CC Email */}
        <div className="w-full md:w-1/3 mt-4 md:mt-0 flex flex-col justify-start pl-4">
          <label className="font-bold text-black text-sm mb-1">Cc Emails :</label>
          <input
            type="text"
            className="border border-gray-400 w-full h-10 px-2"
          />
        </div>
      </div>
    </div>
  );
}
