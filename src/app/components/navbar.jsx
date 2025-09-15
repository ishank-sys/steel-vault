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
      style={{
        background: "linear-gradient(to right, white 0%, white 25%, #176993 100%)"
      }}
    >
      <div className="container mx-auto flex items-center justify-between max-w-full">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/SO_logo.png"
            width={500}
            height={200}
            className={clsx('w-[250px] h-auto')}
            alt="Logo"
          />
        </Link>

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
                Welcome to Steel Doc
              </Link>
            </li>
          )}
          {isLoggedIn && (
            <>
              <li>
                <span className="block px-4 py-2 text-white font-bold tracking-wide">
                  Welcome to Steel Doc
                </span>
              </li>
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block px-4 py-2 text-white hover:text-blue-300 font-bold rounded transition-colors duration-200"
                >
                  Log Out
                </button>
              </li>
              <li>
                <Link href="/about" className="block px-4 py-2 text-white hover:text-blue-300 font-bold rounded transition-colors duration-200">
                  Contact us
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
