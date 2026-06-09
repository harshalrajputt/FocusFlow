import { useState, useEffect } from "react";
import { getSchedule, regenerateSchedule } from "../services/scheduleService";

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EVENT_TYPE_STYLES = {
    sleep: {
        bg: "rgba(15, 23, 42, 0.4)",
        border: "rgba(148, 163, 184, 0.1)",
        color: "#64748b",
        icon: "🌙",
        label: "Sleep"
    },
    class: {
        bg: "rgba(59, 130, 246, 0.1)",
        border: "rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
        icon: "🏫",
        label: "Lectures / School"
    },
    coaching: {
        bg: "rgba(139, 92, 246, 0.12)",
        border: "rgba(139, 92, 246, 0.25)",
        color: "#a78bfa",
        icon: "✏️",
        label: "Coaching / Extra Class"
    },
    commute: {
        bg: "rgba(100, 116, 139, 0.1)",
        border: "rgba(100, 116, 139, 0.15)",
        color: "#94a3b8",
        icon: "🚌",
        label: "Travel Buffer"
    },
    study: {
        bg: "rgba(124, 58, 237, 0.15)",
        border: "rgba(124, 58, 237, 0.3)",
        color: "#c4b5fd",
        icon: "📚",
        label: "Study Slot"
    },
    break: {
        bg: "rgba(16, 185, 129, 0.1)",
        border: "rgba(16, 185, 129, 0.2)",
        color: "#34d399",
        icon: "☕",
        label: "Rest Break"
    },
    leisure: {
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.15)",
        color: "#fcd34d",
        icon: "🏖️",
        label: "Leisure / Personal"
    },
    other: {
        bg: "rgba(148, 163, 184, 0.08)",
        border: "rgba(148, 163, 184, 0.15)",
        color: "#cbd5e1",
        icon: "🗓️",
        label: "Other"
    }
};

export default function Schedule() {
    const [schedule, setSchedule] = useState(null);
    const [selectedDay, setSelectedDay] = useState("Monday");
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const fetchScheduleData = async () => {
        try {
            setError("");
            const response = await getSchedule();
            if (response.data?.schedule) {
                setSchedule(response.data.schedule);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load schedule.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScheduleData();
    }, []);

    const handleRegenerate = async () => {
        if (!window.confirm("Are you sure you want to regenerate your baseline schedule? This will reset custom changes.")) {
            return;
        }

        setRegenerating(true);
        setError("");
        setSuccessMessage("");
        try {
            const response = await regenerateSchedule();
            if (response.data?.schedule) {
                setSchedule(response.data.schedule);
                setSuccessMessage("Baseline schedule regenerated successfully!");
                setTimeout(() => setSuccessMessage(""), 4000);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to regenerate schedule.");
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <svg className="animate-spin-slow w-8 h-8 text-violet-500 mb-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-slate-500 text-sm">Loading baseline schedule...</p>
            </div>
        );
    }

    const currentDaySchedule = schedule?.days?.find(d => d.dayName === selectedDay) || { events: [] };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
                        Baseline Study Schedule 📅
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5">
                        Your Week-1 baseline template generated from onboarding. We use this to compare expectations against actual tracking.
                    </p>
                </div>
                
                <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="self-start md:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-[#0d1526] hover:bg-[#121b30] text-slate-300 text-xs font-semibold tracking-wider uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {regenerating ? (
                        <><svg className="animate-spin-slow w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Regenerating...</>
                    ) : (
                        <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            Reset to Baseline
                        </>
                    )}
                </button>
            </div>

            {/* Alert Logs */}
            {error && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 14a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Day Selector Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800/60 pb-3 animate-fade-in-up delay-1">
                {DAYS_OF_WEEK.map(day => {
                    const isActive = day === selectedDay;
                    const isWeekend = day === "Saturday" || day === "Sunday";
                    
                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                                isActive 
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25' 
                                : 'bg-[#0d1526]/50 border border-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                            }`}
                        >
                            {day} {isWeekend ? "🌴" : ""}
                        </button>
                    );
                })}
            </div>

            {/* Schedule Timeline Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                
                {/* Timeline display: Left 2 columns */}
                <div className="md:col-span-2 space-y-3 animate-fade-in-up delay-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Day Timeline ({selectedDay})</p>
                    
                    {currentDaySchedule.events.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center text-slate-500" style={cardStyle}>
                            No events generated for this day. Click 'Reset to Baseline' to trigger schedule generation.
                        </div>
                    ) : (
                        currentDaySchedule.events.map((event, index) => {
                            const style = EVENT_TYPE_STYLES[event.type] || EVENT_TYPE_STYLES.other;
                            
                            return (
                                <div
                                    key={event._id || index}
                                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:translate-x-1"
                                    style={{
                                        background: style.bg,
                                        border: `1px solid ${style.border}`,
                                    }}
                                >
                                    {/* Icon / Time */}
                                    <div className="text-xl shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900/40">
                                        {style.icon}
                                    </div>

                                    {/* Event Meta */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-200 truncate">{event.title}</h3>
                                            <span 
                                                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
                                                style={{ background: 'rgba(148, 163, 184, 0.08)', color: style.color }}
                                            >
                                                {style.label}
                                            </span>
                                        </div>
                                        {event.associatedGoal && (
                                            <p className="text-xs text-violet-400 font-medium mt-1">
                                                🎯 Target Goal: {event.associatedGoal}
                                            </p>
                                        )}
                                    </div>

                                    {/* Start & End time */}
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-slate-300">{event.startTime}</p>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{event.endTime}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Info block: Right column */}
                <div className="space-y-6 animate-fade-in-up delay-3">
                    
                    {/* Insights Block */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Schedule Insights</p>
                        <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
                            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <span>🧠</span> Baseline Rationale
                            </h3>
                            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                                <p>
                                    This schedule is a **baseline observation layout** for Week 1. It assumes perfect compliance with your onboarding inputs to gather behavioral data.
                                </p>
                                <p>
                                    In **Phases 3 & 4**, FocusFlow will track your focus session logs, skipped tasks, and energy logs to compare against this baseline.
                                </p>
                                <p>
                                    By **Phase 5 (Rule Engine)**, the system will highlight mismatch statistics (e.g. if you study better at 7 AM but claim 8 PM is your peak focus).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Color Indicators Legend */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Legend</p>
                        <div className="rounded-2xl p-5 space-y-3.5" style={cardStyle}>
                            {Object.entries(EVENT_TYPE_STYLES).map(([type, style]) => (
                                <div key={type} className="flex items-center gap-2.5 text-xs text-slate-400">
                                    <span className="text-lg leading-none">{style.icon}</span>
                                    <span className="font-semibold" style={{ color: style.color }}>{style.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}
