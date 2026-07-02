import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export default function NotFound() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#030817] text-white p-6 relative overflow-hidden font-sans">
            {/* Ambient decorative glowing backdrops */}
            <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Glowing Main Glass Card */}
            <div className="max-w-md w-full bg-[#091126]/60 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_40px_rgba(99,102,241,0.05)] relative z-10 animate-fade-in-up">
                {/* 404 Header Illustration */}
                <div className="relative mb-6 select-none">
                    <h1 className="text-8xl md:text-9xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        404
                    </h1>
                </div>

                {/* Main Text content */}
                <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-3">
                    Lost in Focus? 🌌
                </h2>
                <p className="text-slate-400 text-sm md:text-base mb-8 leading-relaxed">
                    The page you are looking for has drifted off into orbit or never existed. Let's get you back on track.
                </p>

                {/* Back Link Button */}
                <Link
                    to={isLoggedIn ? "/dashboard" : "/login"}
                    className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/35 cursor-pointer"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                    >
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    {isLoggedIn ? "Back to Dashboard" : "Return to Login"}
                </Link>
            </div>

            {/* Little footer branding */}
            <div className="absolute bottom-6 text-[10px] uppercase tracking-widest text-slate-600 font-bold select-none z-10">
                FocusFlow Platform
            </div>
        </div>
    );
}
