import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { applyAppearanceSettings } from "../../utils/theme";
import { getMissedSessions } from "../../services/scheduleService";
import MissedSessionModal from "../schedule/MissedSessionModal";
import Background3DCanvas from "./Background3DCanvas";
import { AnimatePresence, motion } from "framer-motion";
import { updateUserProfile } from "../../services/authService";

export default function MainLayout() {
    const location = useLocation();
    const [showToast, setShowToast] = useState(false);
    const [missedSessions, setMissedSessions] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

    // Mandatory username choice overlay states
    const [usernameInput, setUsernameInput] = useState(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            return user.username || "";
        } catch (e) {
            return "";
        }
    });
    const [usernameError, setUsernameError] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);
    const [forceShowUsernameModal, setForceShowUsernameModal] = useState(false);

    useEffect(() => {
        try {
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            if (currentUser.hasSetUsername === false || currentUser.hasSetUsername === "false" || !currentUser.username) {
                setForceShowUsernameModal(true);
                if (!usernameInput && currentUser.username) {
                    setUsernameInput(currentUser.username);
                }
            } else {
                setForceShowUsernameModal(false);
            }
        } catch (e) {
            console.error("Failed to check username status", e);
        }
    }, [usernameInput]);

    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        setUsernameError("");
        const usernameVal = usernameInput.toLowerCase().trim();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(usernameVal)) {
            setUsernameError("Username must be 3-20 characters long and contain only letters, numbers, and underscores.");
            return;
        }

        setSavingUsername(true);
        try {
            const res = await updateUserProfile({ username: usernameVal });
            if (res.data.success) {
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = { 
                    ...currentUser, 
                    ...res.data.user,
                    hasSetUsername: true,
                    username: usernameVal
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                setForceShowUsernameModal(false);
            }
        } catch (err) {
            setUsernameError(err.response?.data?.message || "Failed to update username. Try another one.");
        } finally {
            setSavingUsername(false);
        }
    };

    const checkMissed = async () => {
        try {
            const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const now = new Date();
            const dayName = weekdays[now.getDay()];
            const dateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const res = await getMissedSessions({ date: dateStr, dayName, currentTime: timeStr });
            if (res.data?.success && res.data.missedSessions?.length > 0) {
                setMissedSessions(res.data.missedSessions);
                setModalOpen(true);
            }
        } catch (err) {
            console.error("Failed to check for missed focus sessions:", err);
        }
    };

    useEffect(() => {
        // Run check on mount
        checkMissed();

        // Polling check every 5 minutes
        const interval = setInterval(checkMissed, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleRecovered = (recoveredId) => {
        setMissedSessions(prev => {
            const remaining = prev.filter(s => s._id !== recoveredId);
            if (remaining.length === 0) {
                setModalOpen(false);
            }
            return remaining;
        });
    };

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            if (user?.settings?.appearance) {
                applyAppearanceSettings(user.settings.appearance);
            } else {
                applyAppearanceSettings({
                    theme: "Light",
                    compactSidebar: false,
                    reduceMotion: false,
                    denseLayout: false
                });
            }
        } catch (e) {
            console.error("Failed to load user appearance settings", e);
        }
    }, []);

    useEffect(() => {
        // Check if extension has already been downloaded
        const extStatus = localStorage.getItem("focusflow_ext_status");
        if (extStatus === "downloaded") return;

        let timer;
        const startTimer = () => {
            timer = setTimeout(() => {
                const currentStatus = localStorage.getItem("focusflow_ext_status");
                if (currentStatus !== "downloaded") {
                    setShowToast(true);
                }
            }, 120000); // 2 minutes = 120000ms
        };

        if (!showToast) {
            startTimer();
        }

        return () => clearTimeout(timer);
    }, [showToast]);

    const handleDownloadNow = () => {
        localStorage.setItem("focusflow_ext_status", "downloaded");
        setShowToast(false);
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const rootBase = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) : apiBase;
        window.location.href = `${rootBase}/api/download-extension`;
    };

    const handleAlreadyDownloaded = () => {
        localStorage.setItem("focusflow_ext_status", "downloaded");
        setShowToast(false);
    };

    const handleLater = () => {
        setShowToast(false);
    };

    return (
        <div className="flex min-h-screen relative bg-transparent">
            <Background3DCanvas />
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 overflow-auto relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Slide-in extension promoter toast */}
            {showToast && (
                <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl p-5 shadow-2xl border border-[var(--border-color)] animate-slide-in-right bg-[var(--bg-secondary)]/90 backdrop-blur-md">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2z" />
                                <path d="M14 6V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">Install FocusFlow Extension</h3>
                            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                Sync tasks, block distracting websites (YouTube, Instagram) automatically, and track your focus score in real-time.
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <button
                            onClick={handleDownloadNow}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-semibold hover:shadow-lg transition-all duration-200 cursor-pointer"
                            style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                        >
                            Download Now
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleAlreadyDownloaded}
                                className="py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[11px] font-semibold cursor-pointer transition-colors text-center"
                            >
                                Already Downloaded
                            </button>
                            <button
                                onClick={handleLater}
                                className="py-2 rounded-xl border border-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[11px] font-semibold cursor-pointer transition-colors text-center"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Missed Session Modal */}
            <MissedSessionModal 
                isOpen={modalOpen}
                missedSessions={missedSessions}
                onRecovered={handleRecovered}
                onClose={() => setModalOpen(false)}
            />

            {/* Mandatory Username Setup Modal */}
            {forceShowUsernameModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md animate-fade-in">
                    <div 
                        className="w-full max-w-md p-8 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/90 shadow-2xl relative"
                        style={{
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-gradient)', boxShadow: '0 8px 24px var(--accent-glow)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Choose Your Username</h3>
                            <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xs">
                                FocusFlow now uses unique usernames to let friends find and invite you to accountability pods.
                            </p>
                        </div>

                        {usernameError && (
                            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-xs">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="leading-tight">{usernameError}</span>
                            </div>
                        )}

                        <form onSubmit={handleUsernameSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Unique Username</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">@</span>
                                    <input
                                        required
                                        type="text"
                                        placeholder="johndoe"
                                        value={usernameInput}
                                        onChange={(e) => {
                                            setUsernameError("");
                                            setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                                        }}
                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] outline-none transition-all duration-200 pl-8 pr-4 py-3 focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={savingUsername || !usernameInput.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                                style={{
                                    background: 'var(--accent-gradient)',
                                    boxShadow: '0 4px 12px var(--accent-glow)',
                                }}
                            >
                                {savingUsername ? (
                                    <><svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving...</>
                                ) : (
                                    <>Confirm Username <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}