import { useState } from "react";
import { recoverSession } from "../../services/scheduleService";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 20, boxShadow: 'var(--shadow-lg)' };

export default function MissedSessionModal({ isOpen, missedSessions, onRecovered, onClose }) {
    const [recovering, setRecovering] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    if (!isOpen || !missedSessions || missedSessions.length === 0) return null;

    const currentSession = missedSessions[0];

    const handleChoice = async (choice) => {
        setRecovering(true);
        setError("");
        setSuccessMessage("");
        try {
            await recoverSession({ logId: currentSession._id, choice });
            
            setSuccessMessage(`Schedule updated! Session handled as: ${choice}.`);
            
            setTimeout(() => {
                setSuccessMessage("");
                // Notify parent component to refresh schedule/missed sessions lists
                onRecovered(currentSession._id);
                setRecovering(false);
            }, 1500);
        } catch (err) {
            setError("Failed to recover schedule. Please try again.");
            setRecovering(false);
        }
    };

    const OPTIONS = [
        {
            id: "Critical",
            title: "Critical ⚡",
            desc: "Must be completed today. We'll rearrange today's remaining time to slot it in.",
            color: "#7c3aed",
            bg: "rgba(124,58,237,0.08)",
            border: "rgba(124,58,237,0.2)"
        },
        {
            id: "Important",
            title: "Important ⭐",
            desc: "Move within next 24 hours. We'll reschedule this block later today or tomorrow.",
            color: "#0284c7",
            bg: "rgba(2,132,199,0.08)",
            border: "rgba(2,132,199,0.2)"
        },
        {
            id: "Optional",
            title: "Optional ☕",
            desc: "Skip for now. Skip today and keep workload sustainable. Taking a breather is fine!",
            color: "#10b981",
            bg: "rgba(16,185,129,0.08)",
            border: "rgba(16,185,129,0.2)"
        },
        {
            id: "Cancel",
            title: "Cancel ❌",
            desc: "Remove completely. Remove this study session from today's timeline entirely.",
            color: "#e11d48",
            bg: "rgba(225,29,72,0.08)",
            border: "rgba(225,29,72,0.2)"
        }
    ];

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
            style={{ background: 'rgba(2, 8, 23, 0.7)' }}
        >
            <div 
                className="w-full max-w-lg p-6 md:p-8 space-y-6 animate-fade-in-up"
                style={cardStyle}
            >
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 mb-4 text-2xl animate-float">
                        🌱
                    </div>
                    <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                        Life happens! Let's recover.
                    </h2>
                    <p className="text-[var(--text-muted)] text-sm mt-1.5 leading-relaxed">
                        You missed your scheduled study session:
                        <span className="block font-bold text-[var(--text-primary)] mt-1 bg-[var(--bg-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                            {currentSession.eventTitle} ({currentSession.startTime} - {currentSession.endTime})
                        </span>
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-2">
                        How important was this focus session to you today?
                    </p>
                </div>

                {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-center">{error}</p>}
                {successMessage && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-center">{successMessage}</p>}

                {/* Option Grid */}
                <div className="grid sm:grid-cols-2 gap-3">
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            disabled={recovering || !!successMessage}
                            onClick={() => handleChoice(opt.id)}
                            className="flex flex-col text-left p-4 rounded-xl transition-all duration-200 border cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border-hover)] disabled:opacity-50"
                            style={{
                                background: opt.bg,
                                borderColor: opt.border,
                            }}
                        >
                            <span className="font-extrabold text-sm" style={{ color: opt.color }}>{opt.title}</span>
                            <span className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{opt.desc}</span>
                        </button>
                    ))}
                </div>

                {/* Footer warning list */}
                <div className="border-t border-[var(--border-color)] pt-4 flex items-center justify-between">
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed max-w-[80%]">
                        🔒 FocusFlow guarantees sleep, breaks, and your protected leisure habits will remain locked and untouched.
                    </p>
                    <button
                        onClick={onClose}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-none bg-transparent cursor-pointer"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}
