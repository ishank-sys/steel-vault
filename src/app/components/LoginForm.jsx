"use client";

import React, { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const router = useRouter(); // ✅ useRouter hook


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(""); // clear old errors

        const res = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        setLoading(false);

        if (res?.error) {
            setErrorMsg(res.error); // show error below inputs
        } else {
            router.push("/dashboard"); // success redirect
        }
    };
    return (
        <div className="relative flex flex-col min-h-screen">
            {/* Background image with subtle dark overlay */}
            <div aria-hidden className="absolute inset-0 -z-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/landing-bg.jpg'), url('/bg-image.webp')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-transparent" />
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    {/* Left: Welcome panel (now with subtle teal/cyan gradient, blue still dominant) */}
                    <div className="relative hidden md:flex items-center justify-center p-8 text-white bg-gradient-to-br from-[#186c94] via-[#137b8f] to-[#0fa9b8] text-center">
                        <div className="relative z-10 max-w-sm flex flex-col items-center">
                            <Image
                                src="/Pi7_SO_logo.png"
                                alt="Structures Online logo"
                                width={760}
                                height={146}
                                className="mb-4 h-auto w-auto object-contain"
                                priority
                            />
                            <h1 className="text-3xl font-bold mb-3"></h1>
                            <p className="text-white/90"></p>
                        </div>
                        {/* Decorative map lines / dots */}
                        <div className="pointer-events-none absolute inset-0 opacity-35 z-0">
  <svg aria-hidden viewBox="0 0 500 300" className="w-full h-full">
    <defs>
      <linearGradient id="g1" x1="0" x2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <g fill="none" stroke="url(#g1)" strokeWidth="2">
      {/* More strokes added for denser pattern */}
      <path d="M0,40 C120,20 280,100 400,70" />
      <path d="M0,80 C130,60 270,120 400,90" />
      <path d="M0,120 C125,100 275,160 400,130" />
      <path d="M0,160 C130,140 270,180 400,150" />
      <path d="M0,200 C110,190 260,210 400,190" />
      <path d="M0,240 C120,220 270,250 400,230" />
      <path d="M0,280 C140,260 280,300 400,280" />
      <path d="M0,320 C150,300 290,340 400,320" />
      <path d="M0,360 C130,340 280,380 400,360" />
    </g>
  </svg>
</div>

                    </div>

                    {/* Right: Sign In form */}
                    <div className="p-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign In to Steel Vault!</h2>

                        {errorMsg && (
                            <div className="mb-4 text-red-600 text-sm font-medium">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Username or email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-[#186c94]"
                                    placeholder="user@example.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-[#186c94]"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="inline-flex items-center gap-2 select-none">
                                    <input type="checkbox" className="rounded border-gray-300 text-[#186c94] focus:ring-[#186c94]" />
                                    <span className="text-gray-700">Remember me</span>
                                </label>
                                <a href="/clients/change-password" className="text-[#186c94] hover:underline"></a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`relative w-full rounded-full bg-[#186c94] bg-gradient-to-r from-[#186c94] via-[#167f99] to-[#0fa9b8] hover:from-[#145a79] hover:via-[#0e6d85] hover:to-[#0b8c9e] text-white py-2 text-sm font-semibold transition shadow-sm hover:shadow-md ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <span className="relative z-10">{loading ? 'Signing in…' : 'Sign In'}</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}