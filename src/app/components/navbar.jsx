'use client';

import Link from 'next/link';
import clsx from 'clsx';
import React, { useState } from 'react';
import { signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';

const Navbar = ({ isLoggedIn = false, adminOnly = false }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav
      className=" px-4 py-2"
      style={{ background: 'linear-gradient(to right, white 0%, white 25%, #176993 100%)' }}
      suppressHydrationWarning
    >
      <div className="container mx-auto flex items-center justify-between max-w-full">
        <div className="flex items-center gap-2 select-none cursor-default" aria-label="Logo">
          <img
            src="/SO_logo.png"
            width={500}
            height={200}
            className={clsx('w-[250px] h-auto')}
            alt="Logo"
            draggable={false}
          />
        </div>

        <button
          className="md:hidden flex flex-col justify-center items-center"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block h-1 w-6 bg-white my-1 rounded transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block h-1 w-6 bg-white my-1 rounded transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-1 w-6 bg-white my-1 rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>

        <ul className={`flex-col md:flex-row md:flex items-center gap-8 absolute md:static top-16 left-0 w-full md:w-auto bg-transparent md:bg-transparent z-50 transition-all duration-300 ${menuOpen ? 'flex' : 'hidden md:flex'}`}>
          {!adminOnly && !isLoggedIn && (
            <li>
              <Link href="/" className="block px-4 py-2 text-white hover:text-yellow-500 font-bold tracking-wide transition-colors duration-200">
                Welcome to Steel Vault
              </Link>
            </li>
          )}
          {isLoggedIn && (
            <>
              <li>
                <span className="block px-4 py-2 text-white font-bold tracking-wide">
                  Welcome to Steel Vault
                </span>
              </li>
              <li>
                <button
                  onClick={async () => {
                    try {
                      await signOut({ callbackUrl: "/" });
                    } catch {
                      // Fallback: hard redirect
                      window.location.href = "/";
                    }
                  }}
                  className="block px-4 py-2 text-white hover:text-blue-300 font-bold rounded transition-colors duration-200"
                >
                  Log Out
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMenuOpen(prev => prev || true) || document.getElementById('contact-modal')?.classList.remove('hidden')}
                  className="block px-4 py-2 text-white hover:text-blue-300 font-bold rounded transition-colors duration-200"
                >
                  Contact us
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
      {/* Contact Modal */}
      <div id="contact-modal" className="hidden fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-md shadow-lg w-[90%] max-w-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Contact Us</h3>
            <button
              aria-label="Close contact"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => document.getElementById('contact-modal')?.classList.add('hidden')}
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-medium">service@sol-mail.net</div>
            <div className="font-medium">+1 (602) 563 5958</div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-1 rounded bg-cyan-800 text-white hover:bg-cyan-900"
              onClick={() => document.getElementById('contact-modal')?.classList.add('hidden')}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
