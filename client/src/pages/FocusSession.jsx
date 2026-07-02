import { useState, useEffect, useRef } from "react";
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

    // Extension & allowed domains tracking
    const [allowedWorkSites, setAllowedWorkSites] = useState("");
    const [extensionActive, setExtensionActive] = useState(false);
    const [pausedByDomain, setPausedByDomain] = useState(false);

    // Custom Durations configuration (Phase 23)
    const [modes, setModes] = useState(() => {
        const saved = localStorage.getItem("focusflow_custom_durations");
        const durations = saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
        return [
            { ...MODES[0], duration: durations.focus },
            { ...MODES[1], duration: durations.short },
            { ...MODES[2], duration: durations.long },
        ];
    });

    const [showDurationsConfig, setShowDurationsConfig] = useState(false);
    const [focusInput, setFocusInput] = useState(25);
    const [shortInput, setShortInput] = useState(5);
    const [longInput, setLongInput] = useState(15);
    const [targetEndTime, setTargetEndTime] = useState(null);
    const [alarmPlaying, setAlarmPlaying] = useState(false);
    const alarmAudioRef = useRef(null);

    const mode = modes[modeIdx];
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

    // Listen for extension message syncs and ping on mount
    useEffect(() => {
        // Load pre-saved allowed work sites from local storage if present
        const savedAllowedSites = localStorage.getItem("allowedWorkSites");
        if (savedAllowedSites) {
            setAllowedWorkSites(savedAllowedSites);
        }

        // Load custom timer durations
        const savedDurations = localStorage.getItem("focusflow_custom_durations");
        const parsedDurations = savedDurations ? JSON.parse(savedDurations) : { focus: 25, short: 5, long: 15 };
        if (savedDurations) {
            setFocusInput(parsedDurations.focus);
            setShortInput(parsedDurations.short);
            setLongInput(parsedDurations.long);
        }

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // Restore standalone timer state if active on last reload
        const savedStateStr = localStorage.getItem("focusflow_timer_state");
        if (savedStateStr) {
            const savedState = JSON.parse(savedStateStr);
            if (savedState.running && savedState.targetEndTime && savedState.targetEndTime > Date.now()) {
                setModeIdx(savedState.modeIdx);
                setStartTime(new Date(savedState.startTime));
                setTargetEndTime(savedState.targetEndTime);
                setRunning(true);
                const durMin = savedState.modeIdx === 0 ? (parsedDurations?.focus || 25) : (savedState.modeIdx === 1 ? (parsedDurations?.short || 5) : (parsedDurations?.long || 15));
                const modeTotal = durMin * 60;
                const newElapsed = modeTotal - Math.round((savedState.targetEndTime - Date.now()) / 1000);
                setElapsed(Math.max(0, newElapsed));
            } else if (!savedState.running) {
                setModeIdx(savedState.modeIdx);
                setElapsed(savedState.elapsed || 0);
            }
        }

        let pingInterval = null;

        const handleMessage = (event) => {
            if (event.source !== window) return;
            const message = event.data;
            if (message && message.source === "focusflow-extension") {
                if (message.type === "PONG") {
                    setExtensionActive(true);
                    if (pingInterval) {
                        clearInterval(pingInterval);
                        pingInterval = null;
                    }
                    window.postMessage({ source: "focusflow-webapp", type: "GET_TIMER_STATE" }, "*");
                } else if (message.type === "TIMER_TICK") {
                    setExtensionActive(true);
                    if (pingInterval) {
                        clearInterval(pingInterval);
                        pingInterval = null;
                    }
                    const state = message.state;
                    if (state) {
                        const isFinished = running && !state.isRunning && state.remainingSeconds === 0;
                        setRunning(state.isRunning);
                        setModeIdx(state.currentModeIdx);
                        const savedDurs = localStorage.getItem("focusflow_custom_durations");
                        const parsedDurs = savedDurs ? JSON.parse(savedDurs) : { focus: 25, short: 5, long: 15 };
                        const durMin = state.currentModeIdx === 0 ? parsedDurs.focus : (state.currentModeIdx === 1 ? parsedDurs.short : parsedDurs.long);
                        const durationSec = durMin * 60;
                        setElapsed(durationSec - state.remainingSeconds);
                        setPausedByDomain(!!message.pausedByDomain);
                        if (state.taskId) {
                            setSelectedTaskId(state.taskId);
                        }
                        if (state.allowedSites && state.allowedSites.length > 0) {
                            setAllowedWorkSites(state.allowedSites.join(", "));
                        }
                        if (isFinished) {
                            handleSessionComplete(durationSec);
                        }
                    }
                } else if (message.type === "PLAY_ALARM") {
                    playAlarm();
                    
                    const savedDurs = localStorage.getItem("focusflow_custom_durations");
                    const parsedDurs = savedDurs ? JSON.parse(savedDurs) : { focus: 25, short: 5, long: 15 };
                    const currentModeIdx = message.modeIdx !== undefined ? message.modeIdx : modeIdx;
                    const durMin = currentModeIdx === 0 ? parsedDurs.focus : (currentModeIdx === 1 ? parsedDurs.short : parsedDurs.long);
                    
                    handleSessionComplete(durMin * 60);
                    fetchSummary();
                } else if (message.type === "STOP_ALARM") {
                    if (alarmAudioRef.current) {
                        alarmAudioRef.current.pause();
                        alarmAudioRef.current = null;
                    }
                    setAlarmPlaying(false);
                }
            }
        };

        window.addEventListener("message", handleMessage);

        // Send a ping immediately
        window.postMessage({ source: "focusflow-webapp", type: "PING" }, "*");

        // Setup ping retry interval (every 1.5 seconds) to handle slower content script injection
        pingInterval = setInterval(() => {
            window.postMessage({ source: "focusflow-webapp", type: "PING" }, "*");
        }, 1500);

        return () => {
            window.removeEventListener("message", handleMessage);
            if (pingInterval) {
                clearInterval(pingInterval);
            }
        };
    }, []);
    // Persist standalone state to localStorage (Phase 23)
    useEffect(() => {
        if (extensionActive) return; // Extension manages its own background timer persistence

        if (running) {
            const finalEndTime = targetEndTime || (Date.now() + (total - elapsed) * 1000);
            localStorage.setItem("focusflow_timer_state", JSON.stringify({
                running: true,
                modeIdx,
                targetEndTime: finalEndTime,
                elapsed,
                startTime: startTime ? startTime.toISOString() : new Date().toISOString(),
                allowedWorkSites
            }));
        } else {
            localStorage.setItem("focusflow_timer_state", JSON.stringify({
                running: false,
                modeIdx,
                targetEndTime: null,
                elapsed,
                startTime: null,
                allowedWorkSites
            }));
        }
    }, [running, modeIdx, elapsed, startTime, extensionActive, allowedWorkSites, total, targetEndTime]);

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
                difficultyFeedback: feedbackData.difficulty || "Normal",
                telemetryAvailable: extensionActive
            };

            await logFocusSession(payload);
            
            // Clean up session states
            stopAlarm();
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

    const playAlarm = () => {
        try {
            if (alarmAudioRef.current) {
                alarmAudioRef.current.pause();
                alarmAudioRef.current = null;
            }
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
            audio.loop = true;
            alarmAudioRef.current = audio;
            audio.play().catch(() => {});
            setAlarmPlaying(true);
        } catch (e) {
            console.error("Failed to play alarm", e);
        }
    };

    const stopAlarm = () => {
        if (alarmAudioRef.current) {
            alarmAudioRef.current.pause();
            alarmAudioRef.current = null;
        }
        setAlarmPlaying(false);
        if (extensionActive) {
            window.postMessage({ source: "focusflow-webapp", type: "STOP_ALARM" }, "*");
        }
    };

    // Modal skip (save with defaults)
    const handleSkipFeedback = () => {
        saveSessionWithFeedback();
    };

    const handleSessionComplete = (durationSecs) => {
        const currentMode = modes[modeIdx];
        const end = new Date();
        const start = startTime || new Date(end.getTime() - durationSecs * 1000);

        setCompleted(true);
        localStorage.removeItem("focusflow_timer_state");
        playAlarm();

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("FocusFlow Alert ⚡", {
                body: `${currentMode.label} block completed! Take a step back and breathe.`,
                icon: "/favicon.png"
            });
        }

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
                completed: true,
                telemetryAvailable: extensionActive
            }).then(() => {
                setElapsed(0);
                setStartTime(null);
                fetchSummary();
            });
        }
    };

    const logInterruptedSession = () => {
        setCompleted(false);
        localStorage.removeItem("focusflow_timer_state");
        if (elapsed >= 10 && startTime && modes[modeIdx].label === "Focus") {
            const currentMode = modes[modeIdx];
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
        // If extension is active, we let the extension background script handle countdown and sync ticks
        if (extensionActive) return;

        let timer = null;
        if (running) {
            if (!startTime) {
                setStartTime(new Date());
            }

            const mode = modes[modeIdx];
            const total = mode.duration * 60;

            let currentTarget = targetEndTime;
            if (!currentTarget) {
                currentTarget = Date.now() + (total - elapsed) * 1000;
                setTargetEndTime(currentTarget);
            }

            timer = setInterval(() => {
                const remaining = Math.max(0, currentTarget - Date.now());
                const remainingSecs = Math.ceil(remaining / 1000);
                const nextElapsed = total - remainingSecs;

                setElapsed(nextElapsed);

                if (remaining <= 0) {
                    clearInterval(timer);
                    setRunning(false);
                    setTargetEndTime(null);
                    handleSessionComplete(total);
                    try {
                        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
                        audio.play();
                    } catch (e) {}
                }
            }, 500);
        } else {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [running, modeIdx, startTime, selectedTaskId, extensionActive, modes, targetEndTime]);

    const handlePlayPause = async () => {
        if (!running) {
            setCompleted(false);
            // Announce to pod members that a focus session is starting
            if (modes[modeIdx].label === "Focus") {
                try {
                    const task = tasks.find(t => t._id === selectedTaskId);
                    const label = task?.shareWithPod !== false ? (task?.title || "") : "";
                    await updatePresence(true, label);
                } catch (err) {
                    if (err.response && err.response.status === 409) {
                        alert("You already have an active session! Complete it first.");
                        return;
                    }
                    console.error("Error setting active presence:", err);
                }
            }

            if (extensionActive) {
                localStorage.setItem("allowedWorkSites", allowedWorkSites);
                const allowed = allowedWorkSites.split(",").map(s => s.trim()).filter(Boolean);
                const task = tasks.find(t => t._id === selectedTaskId);
                window.postMessage({
                    source: "focusflow-webapp",
                    type: "START_TIMER",
                    duration: total - elapsed,
                    modeIdx,
                    taskId: selectedTaskId || null,
                    taskLabel: task?.title || "",
                    allowedSites: allowed
                }, "*");
            }
        } else {
            if (running) {
                setPauseCount(prev => prev + 1);
            }
            if (extensionActive) {
                window.postMessage({ source: "focusflow-webapp", type: "PAUSE_TIMER" }, "*");
            }
            setTargetEndTime(null);
            if (modes[modeIdx].label === "Focus") {
                updatePresence(false).catch(() => {});
            }
        }
        
        if (!extensionActive) {
            setRunning(!running);
        }
    };

    const switchMode = (i) => {
        setCompleted(false);
        localStorage.removeItem("focusflow_timer_state");
        if (running) {
            logInterruptedSession();
        }
        if (extensionActive) {
            window.postMessage({ source: "focusflow-webapp", type: "CHANGE_MODE", modeIdx: i }, "*");
        }
        setModeIdx(i);
        setRunning(false);
        setElapsed(0);
        setStartTime(null);
        setTargetEndTime(null);
        setPausedByDomain(false);
    };

    const saveCustomDurations = () => {
        const durations = { focus: Number(focusInput), short: Number(shortInput), long: Number(longInput) };
        localStorage.setItem("focusflow_custom_durations", JSON.stringify(durations));
        
        setModes([
            { ...MODES[0], duration: durations.focus },
            { ...MODES[1], duration: durations.short },
            { ...MODES[2], duration: durations.long },
        ]);

        if (extensionActive) {
            window.postMessage({
                source: "focusflow-webapp",
                type: "UPDATE_CONFIGS",
                allowedSites: allowedWorkSites.split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
                customSettings: {
                    focusTime: durations.focus,
                    shortTime: durations.short,
                    longTime: durations.long
                }
            }, "*");
        }
        
        if (!running) {
            setElapsed(0);
            setTargetEndTime(null);
            localStorage.removeItem("focusflow_timer_state");
        }
        setShowDurationsConfig(false);
    };

    const handleReset = () => {
        setCompleted(false);
        localStorage.removeItem("focusflow_timer_state");
        if (running) {
            logInterruptedSession();
        } else {
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
        }
        if (extensionActive) {
            window.postMessage({ source: "focusflow-webapp", type: "RESET_TIMER" }, "*");
        }
        setRunning(false);
        setTargetEndTime(null);
        setPausedByDomain(false);
        // Clear presence on manual reset
        updatePresence(false).catch(() => {});
    };

    const handleSkip = () => {
        localStorage.removeItem("focusflow_timer_state");
        if (running) {
            logInterruptedSession();
        } else {
            setElapsed(0);
            setStartTime(null);
            setPauseCount(0);
            setInterruptions(0);
        }
        if (extensionActive) {
            window.postMessage({ source: "focusflow-webapp", type: "RESET_TIMER" }, "*");
        }
        setRunning(false);
        setTargetEndTime(null);
        setPausedByDomain(false);
        setModeIdx((modeIdx + 1) % modes.length);
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
                {modes.map((m, i) => (
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
                            pausedByDomain ? (
                                <span className="text-xs mt-2.5 font-bold text-amber-500 animate-pulse flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Paused (Wrong Tab)
                                </span>
                            ) : (
                                <span className="text-xs mt-2.5 font-bold animate-pulse-dot flex items-center gap-1.5" style={{ color: mode.ringColor }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: mode.ringColor }} />
                                    Live
                                </span>
                            )
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-4">
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
                    {alarmPlaying && (
                        <button
                            onClick={stopAlarm}
                            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider animate-pulse transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        >
                            🛑 Stop Alarm
                        </button>
                    )}
                </div>
            </div>

            {/* Distraction logging button (Phase 3) */}
            {running && mode.label === "Focus" && (
                <div className="flex flex-col items-center gap-1.5 animate-fade-in">
                    <button
                        type="button"
                        onClick={() => setInterruptions(prev => prev + 1)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                    >
                        ⚡ Got Distracted ×{interruptions}
                    </button>
                    <p className="text-[10px] text-[var(--text-muted)] text-center max-w-xs leading-relaxed">
                        Tap whenever you get pulled away — helps your AI coach learn your patterns.
                    </p>
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

            {/* Allowed Work URLs */}
            <div className="flex flex-col gap-2 animate-fade-in-up delay-2 max-w-sm mx-auto w-full">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] text-center">
                    Allowed Work URLs (Optional)
                </label>
                <input
                    type="text"
                    value={allowedWorkSites}
                    onChange={(e) => setAllowedWorkSites(e.target.value)}
                    placeholder="youtube.com, chatgpt.com, claude.ai"
                    disabled={running}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] focus:shadow-[0_0_0_3px_var(--accent-glow)] rounded-xl text-[var(--text-primary)] text-sm outline-none px-4 py-3 transition-all duration-200"
                />
                <p className="text-[10px] text-[var(--text-muted)] text-center">
                    Timer only runs when active on these websites. (Leave blank to allow all).
                </p>
                {!extensionActive && allowedWorkSites && (
                    <p className="text-[10px] text-amber-500 font-semibold text-center mt-1 animate-pulse">
                        ⚠️ Allowed sites checking is disabled because the FocusFlow companion extension is not active.
                    </p>
                )}
            </div>

            {/* Custom Durations Accordion (Phase 23) */}
            <div className="rounded-xl overflow-hidden max-w-sm mx-auto w-full animate-fade-in-up delay-2" style={cardStyle}>
                <button
                    onClick={() => setShowDurationsConfig(!showDurationsConfig)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                    <span>⚙️ Configure Timer Durations</span>
                    <span>{showDurationsConfig ? "▲" : "▼"}</span>
                </button>
                {showDurationsConfig && (
                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Focus (m)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={focusInput}
                                    onChange={(e) => setFocusInput(e.target.value)}
                                    disabled={running}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Short (m)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={shortInput}
                                    onChange={(e) => setShortInput(e.target.value)}
                                    disabled={running}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Long (m)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={longInput}
                                    onChange={(e) => setLongInput(e.target.value)}
                                    disabled={running}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDurationsConfig(false)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveCustomDurations}
                                disabled={running}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}
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