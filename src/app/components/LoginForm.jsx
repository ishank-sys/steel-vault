"use client";

import React, { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import Navbar from "../components/navbar";
import { useRouter } from "next/navigation";
import Footer from "../components/footer";

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
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 -z-10">
                    <Image
                        src="/bg-image.webp"
                        alt="Background"
                        fill
                        sizes="100vw"
                        className="object-cover"
                        priority
                    />
                </div>

                {/* Login Form */}
                <form
                    onSubmit={handleSubmit}
                    className="relative z-10 max-w-sm w-full bg-white/70 p-6 rounded-xl shadow-2xl backdrop-blur-sm"
                >
                    <h5 className="mb-4 text-center text-gray-800 font-bold text-lg">
                        Please enter your email and password
                    </h5>

                    {errorMsg && (
                        <div className="mb-4 text-red-600 text-center font-medium">
                            {errorMsg}
                        </div>
                    )}

                    {/* Email */}
                    <div className="mb-6">
                        <label
                         suppressHydrationWarning
                            htmlFor="email"
                            className="block mb-2 text-base font-medium text-gray-700"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-gray-100 text-gray-900 text-sm rounded-lg block w-full p-2 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                            placeholder="user@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-6">
                        <label
                            htmlFor="password"
                            className="block mb-2 text-base font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-gray-100 text-gray-900 text-sm rounded-lg block w-full p-2 placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                   


                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`text-white bg-gradient-to-r from-green-600 via-green-500 to-green-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-semibold rounded-lg text-base w-full px-5 py-2 transition active:scale-95 ${loading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                    >
                        {loading ? "Logging in..." : "Submit"}
                    </button>
                </form>
            </div>
            <Footer />
        </div>
    );
}
