import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { applyAppearanceSettings } from "../../utils/theme";
import { getMissedSessions } from "../../services/scheduleService";
import MissedSessionModal from "../schedule/MissedSessionModal";

export default function MainLayout() {
    const [showToast, setShowToast] = useState(false);
    const [missedSessions, setMissedSessions] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

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
        window.location.href = "http://localhost:5000/api/download-extension";
    };

    const handleAlreadyDownloaded = () => {
        localStorage.setItem("focusflow_ext_status", "downloaded");
        setShowToast(false);
    };

    const handleLater = () => {
        setShowToast(false);
    };

    return (
        <div className="flex min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 overflow-auto">
                    <Outlet />
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
        </div>
    );
}