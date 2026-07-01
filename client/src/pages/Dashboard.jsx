import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getTasks } from "../services/taskService";
import { getFocusSummary } from "../services/focusService";
import { getProfile } from "../services/profileService";
import { getDailyWebsiteUsage } from "../services/websiteUsageService";
import TiltContainer from "../components/layout/TiltContainer";

const buildStatCards = (taskStats, focusSummary, webStats) => [
    {
        label: "Total Tasks",
        value: String(taskStats.total),
        sub: taskStats.total === 0 ? "No tasks yet" : `${taskStats.total} task${taskStats.total !== 1 ? "s" : ""} total`,
        glow: "var(--accent-glow)",
        valueColor: "var(--text-primary)",
        iconBg: "var(--bg-tertiary)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    },
    {
        label: "Tasks Done",
        value: String(taskStats.completed),
        sub: taskStats.completed === 0 ? "Keep going!" : `${taskStats.completed} done!`,
        glow: "rgba(16,185,129,0.06)",
        valueColor: "#10b981",
        iconBg: "rgba(16,185,129,0.12)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
        label: "Focus Hours",
        value: `${(focusSummary.totalFocusMinutes / 60).toFixed(1)}h`,
        sub: `${focusSummary.sessionsToday} session${focusSummary.sessionsToday !== 1 ? "s" : ""} today`,
        glow: "var(--accent-glow)",
        valueColor: "var(--accent-color)",
        iconBg: "var(--accent-glow)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
        label: "Day Streak",
        value: `${focusSummary.currentStreak}d`,
        sub: `Best streak: ${focusSummary.bestStreak}d`,
        glow: "rgba(245,158,11,0.06)",
        valueColor: "#d97706",
        iconBg: "rgba(245,158,11,0.12)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
    {
        label: "Focus Score",
        value: `${webStats.focusScore}%`,
        sub: `Active: ${(webStats.summary.totalActiveTime / 3600).toFixed(1)}h today`,
        glow: "var(--accent-glow)",
        valueColor: "var(--accent-color)",
        iconBg: "var(--accent-glow)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
    },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const firstName = user?.name?.split(" ")[0] || "there";

    const quickActions = [
        {
            label: "Start Focus Session",
            desc: "Begin a timed deep work block",
            path: "/focus",
            bg: "var(--accent-gradient)",
            glow: "var(--accent-glow)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
        },
        {
            label: "Add New Task",
            desc: "Capture what needs to get done",
            path: "/tasks",
            bg: "linear-gradient(135deg, #0284c7, #0d9488)",
            glow: "rgba(2, 132, 199, 0.15)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
        },
        {
            label: "View Analytics",
            desc: "See your productivity trends",
            path: "/analytics",
            bg: "linear-gradient(135deg, #0f766e, #0d9488)",
            glow: "rgba(13, 148, 136, 0.15)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
        },
    ];

    const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });
    const [focusSummary, setFocusSummary] = useState({
        sessionsToday: 0,
        totalFocusMinutes: 0,
        todayFocusMinutes: 0,
        currentStreak: 0,
        bestStreak: 0
    });
    const [webStats, setWebStats] = useState({
        focusScore: 0,
        summary: { productiveTime: 0, distractingTime: 0, neutralTime: 0, totalActiveTime: 0 },
        domains: []
    });
    const [studentProfile, setStudentProfile] = useState(null);

    useEffect(() => {
        // Load tasks
        getTasks().then(res => {
            const tasks = res.data.tasks || [];
            setTaskStats({
                total: tasks.length,
                completed: tasks.filter(t => t.status === "Completed").length,
            });
        }).catch(() => {});

        // Load focus summary
        getFocusSummary().then(res => {
            if (res.data) {
                setFocusSummary({
                    sessionsToday: res.data.sessionsToday || 0,
                    totalFocusMinutes: res.data.totalFocusMinutes || 0,
                    todayFocusMinutes: res.data.todayFocusMinutes || 0,
                    currentStreak: res.data.currentStreak || 0,
                    bestStreak: res.data.bestStreak || 0
                });
            }
        }).catch(() => {});

        // Load student profile
        getProfile().then(res => {
            if (res.data && res.data.data) {
                setStudentProfile(res.data.data);
            }
        }).catch(() => {});

        // Load website stats
        const dateStr = new Date().toLocaleDateString('en-CA');
        getDailyWebsiteUsage(dateStr).then(res => {
            if (res.data && res.data.success) {
                setWebStats({
                    focusScore: res.data.focusScore || 0,
                    summary: res.data.summary || { productiveTime: 0, distractingTime: 0, neutralTime: 0, totalActiveTime: 0 },
                    domains: res.data.domains || []
                });
            }
        }).catch(() => {});
    }, []);

    const hasHistory = focusSummary.totalFocusMinutes > 0 || taskStats.total > 0;
    const DAILY_TARGET_MINUTES = hasHistory ? 240 : 25;
    const progressPercent = Math.min(100, Math.round((focusSummary.todayFocusMinutes / DAILY_TARGET_MINUTES) * 100));

    const exportStreakCard = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(1, "#020617");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);

        // Styling Border
        ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
        ctx.lineWidth = 2;
        ctx.strokeRect(15, 15, 370, 370);

        // Header Title
        ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "center";
        ctx.fillText("FOCUSFLOW STUDY CARD", 200, 50);

        // User handle
        ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`@${user.username || firstName}`, 200, 95);

        // Fire emoji icon
        ctx.font = "70px system-ui, -apple-system, sans-serif";
        ctx.fillText("🔥", 200, 185);

        // Streak count
        ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(`${focusSummary.currentStreak} Day Streak`, 200, 235);

        // Summary details
        ctx.font = "14px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`Today's Focus: ${(focusSummary.todayFocusMinutes / 60).toFixed(1)} hrs`, 200, 280);
        ctx.fillText(`Web Focus Score: ${webStats.focusScore}%`, 200, 305);

        // Tier classification
        ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#0ea5e9";
        ctx.fillText("Sky Blue Tier Student", 200, 345);

        // Save
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `focusflow-streak-${user.username || firstName}.png`;
        link.href = dataUrl;
        link.click();
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in">

            {/* ── Hero ── */}
            <div className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse-dot"
                        style={{ background: '#10b981', boxShadow: '0 0 0 0 rgba(16,185,129,0.5)' }}
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-[10px]">All systems go</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Welcome back, <span className="text-sky-600 dark:text-sky-400">{firstName}</span> 🎯
                </h1>
                {studentProfile?.basic && (
                    <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-xs font-medium">
                        🧑‍🎓 Student: <span className="text-sky-600 dark:text-sky-400 font-semibold">{studentProfile.basic.academicLevel}</span>
                        {studentProfile.basic.institutionName && ` at ${studentProfile.basic.institutionName}`}
                        {studentProfile.basic.streamOrBranch && ` (${studentProfile.basic.streamOrBranch})`}
                    </p>
                )}
                <p className="text-slate-500 mt-2 text-sm">Here's your productivity overview for today.</p>
            </div>

            {/* ── Stat Cards ── */}
            {!hasHistory ? (
                <TiltContainer
                    className="w-full rounded-2xl stat-card-glow p-6 text-center animate-fade-in-up"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Welcome to FocusFlow! 🚀
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-lg mx-auto leading-relaxed">
                        Let's start your very first study block. No tasks or configurations needed—just click below to start a quick 25-minute Pomodoro timer!
                    </p>
                    <button
                        onClick={() => navigate("/focus?quickStart=true")}
                        className="px-6 py-2.5 rounded-xl font-bold text-white text-xs transition cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--accent-gradient)' }}
                    >
                        Start Quick Focus Timer ⏱️
                    </button>
                </TiltContainer>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {buildStatCards(taskStats, focusSummary, webStats).map((s, i) => (
                        <TiltContainer
                            key={s.label}
                            className={`animate-fade-in-up delay-${i + 1} rounded-2xl cursor-default stat-card-glow group`}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)',
                            }}
                        >
                            <div className="p-5 relative overflow-hidden h-full w-full">
                                {/* Glow */}
                                <div className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at top right, ${s.glow}, transparent 70%)` }} />
                                <div className="relative z-10">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: s.iconBg }}>
                                        {s.icon}
                                    </div>
                                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">{s.label}</p>
                                    <p className="text-4xl font-extrabold tracking-tight" style={{ color: s.valueColor }}>{s.value}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{s.sub}</p>
                                </div>
                            </div>
                        </TiltContainer>
                    ))}
                </div>
            )}

            {/* ── Bottom Row ── */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Quick Actions */}
                <div className="animate-fade-in-up delay-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Actions</p>
                    <div className="space-y-2">
                        {quickActions.map(qa => (
                            <button
                                key={qa.label}
                                onClick={() => navigate(qa.path)}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.transform = ''; }}
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: qa.bg, boxShadow: `0 4px 12px ${qa.glow}` }}>
                                    {qa.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">{qa.label}</p>
                                    <p className="text-slate-500 dark:text-slate-450 text-xs mt-0.5">{qa.desc}</p>
                                </div>
                                <svg className="ml-auto text-slate-400 dark:text-slate-500 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Focus Goal */}
                <div className="animate-fade-in-up delay-4 flex flex-col gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Today's Focus Goal</p>
                        <TiltContainer
                            className="rounded-2xl"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                                        style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                                    >
                                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Deep Work Goal</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{(DAILY_TARGET_MINUTES / 60).toFixed(1)} hours target</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                                        <span>{(focusSummary.todayFocusMinutes / 60).toFixed(1)}h completed</span>
                                        <span className="text-slate-400 dark:text-slate-500">{(DAILY_TARGET_MINUTES / 60).toFixed(1)}h goal</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-primary)' }}>
                                        <div
                                            className="h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${progressPercent}%`, background: 'var(--accent-gradient)' }}
                                        />
                                    </div>
                                </div>

                                <p className="text-slate-700 dark:text-slate-350 text-xs font-light">
                                    {progressPercent >= 100 
                                        ? "🎉 Amazing! You met your daily focus goal!" 
                                        : `You are ${progressPercent}% of the way to meeting your target today.`}
                                </p>

                                <button
                                    onClick={() => navigate("/focus")}
                                    className="mt-4 flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400 transition-colors border-none bg-transparent cursor-pointer"
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--accent-color)'}
                                >
                                    Start focus session
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </button>
                                <button
                                    onClick={exportStreakCard}
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors"
                                >
                                    Export Shareable Streak Card 🤳
                                </button>
                            </div>
                        </TiltContainer>
                    </div>

                    {/* Website Usage Log */}
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Today's Web Activity</p>
                        <TiltContainer
                            className="rounded-2xl"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                        >
                            <div className="p-5 space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                    <span>🌐</span> Browser Telemetry
                                </h3>
                                
                                {webStats.summary.totalActiveTime > 0 ? (
                                    <div className="space-y-4">
                                        {/* Ratio bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                <span>Breakdown</span>
                                                <span className="text-teal-600 dark:text-teal-400">{(webStats.summary.productiveTime / 60).toFixed(0)}m Productive</span>
                                            </div>
                                            <div className="w-full h-3 rounded-full flex overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                {webStats.summary.productiveTime > 0 && (
                                                    <div 
                                                        className="h-full bg-teal-500 transition-all duration-500" 
                                                        style={{ width: `${(webStats.summary.productiveTime / webStats.summary.totalActiveTime) * 100}%` }} 
                                                    />
                                                )}
                                                {webStats.summary.neutralTime > 0 && (
                                                    <div 
                                                        className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500" 
                                                        style={{ width: `${(webStats.summary.neutralTime / webStats.summary.totalActiveTime) * 100}%` }} 
                                                    />
                                                )}
                                                {webStats.summary.distractingTime > 0 && (
                                                    <div 
                                                        className="h-full bg-rose-500 transition-all duration-500" 
                                                        style={{ width: `${(webStats.summary.distractingTime / webStats.summary.totalActiveTime) * 100}%` }} 
                                                    />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"/>Productive</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600"/>Neutral</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/>Distracting</span>
                                            </div>
                                        </div>

                                        {/* Top domains */}
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Top Visited Sites</p>
                                            <div className="space-y-2">
                                                {webStats.domains.slice(0, 4).map((d) => (
                                                    <div key={d.domain} className="flex justify-between items-center text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)] pb-2 last:border-0 last:pb-0">
                                                        <span className="font-semibold flex items-center gap-1.5">
                                                            <span className={
                                                                d.category === 'Productive' ? 'text-teal-500' :
                                                                d.category === 'Distracting' ? 'text-rose-500' : 'text-slate-400'
                                                            }>●</span>
                                                            {d.domain}
                                                        </span>
                                                        <span className="text-[var(--text-muted)] font-medium">
                                                            {d.minutes > 0 ? `${d.minutes}m` : `${d.timeSpent}s`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                            No browser activity tracked today.
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Active tracking begins automatically once you start working with the companion extension.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </TiltContainer>
                    </div>

                    {/* Academic Targets Panel */}
                    {studentProfile?.goals && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Academic Focus Targets</p>
                            <TiltContainer
                                className="rounded-2xl"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                            >
                                <div className="p-5 space-y-3">
                                    {studentProfile.goals.academicGoals && studentProfile.goals.academicGoals.length > 0 && (
                                        <div>
                                            <p className="text-slate-550 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Academic Goals</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {studentProfile.goals.academicGoals.map((g, i) => (
                                                    <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                                        🎯 {g}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {studentProfile.goals.skillsToLearn && studentProfile.goals.skillsToLearn.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                            <p className="text-slate-550 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Skills to Learn</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {studentProfile.goals.skillsToLearn.map((s, i) => (
                                                    <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-lg text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20">
                                                        ⚡ {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {studentProfile.goals.studyStyle && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-450 flex items-center justify-between">
                                            <span>Preferred Style:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{studentProfile.goals.studyStyle}</span>
                                        </div>
                                    )}
                                </div>
                            </TiltContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}