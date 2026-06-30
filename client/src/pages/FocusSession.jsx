import { useState, useEffect } from "react";
import { logFocusSession, getFocusSummary, updatePresence } from "../services/focusService";
import { getTasks } from "../services/taskService";
import Timer3DVisual from "../components/layout/Timer3DVisual";

const MODES = [
    {
        label: "Focus", duration: 25,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
        ringColor: '#0284c7', ringGlow: 'rgba(2,132,199,0.25)',
    },
    {
        label: "Short Break", duration: 5,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
        ringColor: '#0d9488', ringGlow: 'rgba(13,148,136,0.2)',
    },
    {
        label: "Long Break", duration: 15,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
        ringColor: '#0369a1', ringGlow: 'rgba(3,105,161,0.2)',
    },
];

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };

// Post-Session Feedback Modal (Phase 3 Adherence & Ratings)
const PostSessionModal = ({ isOpen, onClose, onSubmit, isCompleted }) => {
    const [rating, setRating] = useState(3);
    const [difficulty, setDifficulty] = useState("Normal");
    const [followedSchedule, setFollowedSchedule] = useState(true);
    const [missedTask, setMissedTask] = useState(false);
    const [delayedTask, setDelayedTask] = useState(false);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
        >
            <div
                className="w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5"
                style={cardStyle}
            >
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 mb-3 text-xl">
                        {isCompleted ? "🏆" : "⚠️"}
                    </div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {isCompleted ? "Session Complete!" : "Session Stopped"}
                    </h2>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Reflect on your focus to improve your scheduling profile.</p>
                </div>

                <div className="space-y-4">
                    {/* Rating */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 text-center">
                            Focus Rating (1 - 5 stars)
                        </label>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="text-2xl transition-transform hover:scale-110 cursor-pointer"
                                >
                                    {star <= rating ? "★" : "☆"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                            How difficult was it to focus?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {["Easy", "Normal", "Difficult"].map((diff) => (
                                <button
                                    key={diff}
                                    type="button"
                                    onClick={() => setDifficulty(diff)}
                                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                                        difficulty === diff
                                        ? 'bg-[var(--accent-glow)] border-[var(--accent-color)] text-[var(--accent-color)]'
                                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Adherence Checkboxes */}
                    <div className="space-y-2 border-t border-[var(--border-color)] pt-4">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                            Schedule Adherence
                        </label>
                        
                        <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)]">
                            <input
                                type="checkbox"
                                checked={followedSchedule}
                                onChange={(e) => setFollowedSchedule(e.target.checked)}
                                className="accent-sky-500 h-4 w-4 rounded"
                            />
                            <div className="text-xs text-[var(--text-secondary)]">
                                <p className="font-semibold text-[var(--text-primary)]">Followed scheduled slot</p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">I am studying when scheduled.</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)]">
                            <input
                                type="checkbox"
                                checked={missedTask}
                                onChange={(e) => setMissedTask(e.target.checked)}
                                className="accent-sky-500 h-4 w-4 rounded"
                            />
                            <div className="text-xs text-[var(--text-secondary)]">
                                <p className="font-semibold text-[var(--text-primary)]">Missed a task earlier today</p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">I skipped some scheduled study periods.</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)]">
                            <input
                                type="checkbox"
                                checked={delayedTask}
                                onChange={(e) => setDelayedTask(e.target.checked)}
                                className="accent-sky-500 h-4 w-4 rounded"
                            />
                            <div className="text-xs text-[var(--text-secondary)]">
                                <p className="font-semibold text-[var(--text-primary)]">Task was delayed</p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">I started studying later than planned.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-colors"
                    >
                        Skip Feedback
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubmit({ rating, difficulty, followedSchedule, missedTask, delayedTask })}
                        className="flex-1 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer"
                        style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 12px var(--accent-glow)' }}
                    >
                        Submit & Save
                    </button>
                </div>
            </div>
        </div>
    );
};

const FocusSession = () => {
    const [modeIdx, setModeIdx] = useState(0);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [tasks, setTasks] = useState([]);
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [summary, setSummary] = useState({
        sessionsToday: 0,
        totalFocusMinutes: 0,
        currentStreak: 0,
        bestStreak: 0,
    });

    // Behavioral Tracking states (Phase 3)
    const [pauseCount, setPauseCount] = useState(0);
    const [interruptions, setInterruptions] = useState(0);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [pendingSession, setPendingSession] = useState(null);
    const [completed, setCompleted] = useState(false);

    const mode = MODES[modeIdx];
    const total = mode.duration * 60;
    const remaining = total - elapsed;
    const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
    const secs = String(remaining % 60).padStart(2, "0");
    const progress = elapsed / total;

    const R = 88;
    const circ = 2 * Math.PI * R;
    const dash = circ - progress * circ;

    const fetchTasks = async () => {
        try {
            const res = await getTasks();
            const activeTasks = (res.data.tasks || []).filter(
                (t) => t.status === "Pending" || t.status === "In Progress"
            );
            setTasks(activeTasks);
        } catch (error) {
            console.error("Error fetching tasks for focus timer", error);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await getFocusSummary();
            if (res.data.success) {
                setSummary({
                    sessionsToday: res.data.sessionsToday || 0,
                    totalFocusMinutes: res.data.totalFocusMinutes || 0,
                    currentStreak: res.data.currentStreak || 0,
                    bestStreak: res.data.bestStreak || 0,
                });
            }
        } catch (error) {
            console.error("Error fetching focus summary", error);
        }
    };

    useEffect(() => {
        fetchSummary();
        fetchTasks();
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if ((queryParams.get("quickStart") === "true" || queryParams.get("initOnboarding") === "true") && !running) {
            setCompleted(false);
            setRunning(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [tasks]);

    // Phase 3: Submit session logs with behavioral metrics
    const saveSessionWithFeedback = async (feedbackData = {}) => {
        if (!pendingSession) return;

        try {
            const payload = {
                taskId: selectedTaskId || null,
                sessionType: pendingSession.sessionType,
                duration: pendingSession.duration,
                startTime: pendingSession.startTime,
                endTime: pendingSession.endTime,
                completed: pendingSession.completed,
                interruptions,
                pauseCount,
                followedSchedule: feedbackData.followedSchedule !== undefined ? feedbackData.followedSchedule : true,
                missedTask: feedbackData.missedTask || false,
                delayedTask: feedbackData.delayedTask || false,
                difficultyRating: feedbackData.rating || 3,
                difficultyFeedback: feedbackData.difficulty || "Normal"
            };

            await logFocusSession(payload);
            
            // Clean up session states
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
            setPendingSession(null);
            setFeedbackModalOpen(false);

            fetchSummary();
        } catch (error) {
            console.error("Error logging focus session with feedback", error);
        }
    };

    // Modal skip (save with defaults)
    const handleSkipFeedback = () => {
        saveSessionWithFeedback();
    };

    const handleSessionComplete = (durationSecs) => {
        const currentMode = MODES[modeIdx];
        const end = new Date();
        const start = startTime || new Date(end.getTime() - durationSecs * 1000);

        setCompleted(true);

        setPendingSession({
            sessionType: currentMode.label,
            duration: durationSecs,
            startTime: start,
            endTime: end,
            completed: true
        });

        // Open feedback modal for Focus sessions, else log break directly
        if (currentMode.label === "Focus") {
            setFeedbackModalOpen(true);
        } else {
            // Log breaks directly
            logFocusSession({
                taskId: null,
                sessionType: currentMode.label,
                duration: durationSecs,
                startTime: start,
                endTime: end,
                completed: true
            }).then(() => {
                setElapsed(0);
                setStartTime(null);
                fetchSummary();
            });
        }
    };

    const logInterruptedSession = () => {
        setCompleted(false);
        if (elapsed >= 10 && startTime && MODES[modeIdx].label === "Focus") {
            const currentMode = MODES[modeIdx];
            const end = new Date();
            
            setPendingSession({
                sessionType: currentMode.label,
                duration: elapsed,
                startTime: startTime,
                endTime: end,
                completed: false
            });
            setFeedbackModalOpen(true);
        } else {
            // Just clear timer
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
        }
    };

    useEffect(() => {
        let timer = null;
        if (running) {
            if (!startTime) {
                setStartTime(new Date());
            }
            timer = setInterval(() => {
                setElapsed((prev) => {
                    const nextElapsed = prev + 1;
                    const mode = MODES[modeIdx];
                    const total = mode.duration * 60;
                    if (nextElapsed >= total) {
                        clearInterval(timer);
                        setRunning(false);
                        handleSessionComplete(total);
                        return total;
                    }
                    return nextElapsed;
                });
            }, 1000);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [running, modeIdx, startTime, selectedTaskId]);

    const handlePlayPause = () => {
        if (!running) {
            setCompleted(false);
            // Announce to pod members that a focus session is starting
            if (MODES[modeIdx].label === "Focus") {
                const task = tasks.find(t => t._id === selectedTaskId);
                const label = task?.shareWithPod !== false ? (task?.title || "") : "";
                updatePresence(true, label).catch(() => {});
            }
        }
        if (running) {
            setPauseCount(prev => prev + 1);
        }
        setRunning(!running);
    };

    const switchMode = (i) => {
        setCompleted(false);
        if (running) {
            logInterruptedSession();
        }
        setModeIdx(i);
        setRunning(false);
        setElapsed(0);
        setStartTime(null);
    };

    const handleReset = () => {
        setCompleted(false);
        if (running) {
            logInterruptedSession();
        } else {
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
        }
        setRunning(false);
        // Clear presence on manual reset
        updatePresence(false).catch(() => {});
    };

    const handleSkip = () => {
        if (running) {
            logInterruptedSession();
        } else {
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
        }
        setRunning(false);
        setModeIdx((modeIdx + 1) % MODES.length);
    };

    return (
        <div className="p-6 md:p-8 max-w-2xl mx-auto w-full space-y-8">
            
            {/* Header */}
            <div className="animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Focus Timer ⏱️</h1>
                <p className="text-[var(--text-muted)] text-sm mt-1">Deep study using the Pomodoro technique with behavioral tracking</p>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1.5 rounded-xl p-1.5 animate-fade-in-up delay-1" style={cardStyle}>
                {MODES.map((m, i) => (
                    <button
                        key={m.label}
                        onClick={() => switchMode(i)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                        style={modeIdx === i
                            ? { background: `${m.ringColor}22`, color: m.ringColor, border: `1px solid ${m.ringColor}40` }
                            : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }
                        }
                    >
                        <span style={modeIdx === i ? { color: m.ringColor } : {}}>{m.icon}</span>
                        <span className="hidden sm:inline">{m.label}</span>
                    </button>
                ))}
            </div>

            {/* Timer Ring */}
            <div className="flex flex-col items-center gap-8 animate-fade-in-up delay-2">
                <div className="relative" style={{ width: 240, height: 240 }}>
                    <Timer3DVisual running={running} color={mode.ringColor} completed={completed} />
                    {/* Outer breathing glow */}
                    <div
                        className={`absolute inset-[-15px] rounded-full ${running ? 'animate-breathe' : ''}`}
                        style={{
                            background: `radial-gradient(circle, ${mode.ringGlow} 0%, transparent 60%)`,
                            filter: 'blur(25px)',
                            opacity: running ? 0.8 : 0.3,
                            transition: 'opacity 0.5s ease',
                        }}
                    />
                    <svg width="240" height="240" style={{ transform: 'rotate(-90deg)' }}>
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={mode.ringColor} />
                                <stop offset="100%" stopColor={mode.ringColor === '#7c3aed' ? '#4f46e5' : mode.ringColor === '#10b981' ? '#0d9488' : '#2563eb'} />
                            </linearGradient>
                        </defs>
                        {/* Track */}
                        <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="6" />
                        {/* Progress */}
                        <circle
                            cx="120" cy="120" r={R}
                            fill="none"
                            stroke="url(#ringGrad)"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={dash}
                            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s', filter: `drop-shadow(0 0 6px ${mode.ringGlow})` }}
                        />
                    </svg>

                    {/* Timer text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono font-extrabold text-[var(--text-primary)] text-5xl tracking-tighter">{mins}:{secs}</span>
                        <span className="text-[var(--text-muted)] text-sm mt-1 font-semibold tracking-wide uppercase text-[10px]">{mode.label}</span>
                        {running && (
                            <span className="text-xs mt-2.5 font-bold animate-pulse-dot flex items-center gap-1.5" style={{ color: mode.ringColor }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: mode.ringColor }} />
                                Live
                            </span>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-5">
                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] transition-all duration-200 cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={handlePlayPause}
                        className="w-[70px] h-[70px] flex items-center justify-center rounded-full text-white transition-all duration-200 cursor-pointer"
                        style={{
                            background: `linear-gradient(135deg, ${mode.ringColor}, ${mode.ringColor === '#0284c7' ? '#0d9488' : mode.ringColor === '#0d9488' ? '#0f766e' : '#02507d'})`,
                            boxShadow: `0 0 0 8px ${mode.ringColor}18, 0 8px 24px ${mode.ringGlow}`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.07)'; e.currentTarget.style.boxShadow = `0 0 0 12px ${mode.ringColor}22, 0 12px 32px ${mode.ringGlow}`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 0 8px ${mode.ringColor}18, 0 8px 24px ${mode.ringGlow}`; }}
                    >
                        {running ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                    </button>

                    {/* Skip */}
                    <button
                        onClick={handleSkip}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)] transition-all duration-200 cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    </button>
                </div>
            </div>

            {/* Distraction logging button (Phase 3) */}
            {running && mode.label === "Focus" && (
                <div className="flex justify-center animate-fade-in">
                    <button
                        type="button"
                        onClick={() => setInterruptions(prev => prev + 1)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                    >
                        ⚡ Log Distraction ({interruptions})
                    </button>
                </div>
            )}

            {/* Task Selector */}
            <div className="flex flex-col gap-2 animate-fade-in-up delay-2 max-w-sm mx-auto w-full">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] text-center">
                    Focus Target Task
                </label>
                <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_var(--accent-glow)] rounded-xl text-[var(--text-primary)] text-sm outline-none px-4 py-3 cursor-pointer transition-all duration-200"
                >
                    <option value="" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">General Focus / No Task Selected</option>
                    {tasks.map(t => (
                        <option key={t._id} value={t._id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                            {t.title} ({t.priority})
                        </option>
                    ))}
                </select>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-3">
                {[
                    { label: "Sessions Today", value: String(summary.sessionsToday) },
                    { label: "Total Focus", value: `${summary.totalFocusMinutes}m` },
                    { label: "Best Streak", value: String(summary.bestStreak) },
                ].map(s => (
                    <div key={s.label} className="rounded-xl text-center py-4 px-3" style={cardStyle}>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
                        <p className="text-[var(--text-secondary)] text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Feedback Modal Overlay */}
            <PostSessionModal
                isOpen={feedbackModalOpen}
                isCompleted={pendingSession?.completed}
                onClose={handleSkipFeedback}
                onSubmit={saveSessionWithFeedback}
            />
        </div>
    );
};

export default FocusSession;