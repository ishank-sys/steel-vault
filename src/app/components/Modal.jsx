import React from 'react';
// import { XMarkIcon } from '@heroicons/react/24/solid';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2">
      <div className="relative bg-white border-[6px] border-black rounded-md shadow-lg w-full max-w-6xl p-4">
        {/* Top Blue Header */}
        <div className="relative bg-gradient-to-b from-[#d9efff] to-[#8dc4e6] rounded-t-md px-4 py-2">
          <span className="bg-white text-orange-600 font-semibold px-4 py-1 rounded-t-md inline-block border border-gray-300 shadow">
            {title}
          </span>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-4 -right-4 w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center shadow-lg"
          >
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
