import { useNavigate } from "react-router-dom";

const statCards = [
    {
        label: "Total Tasks",
        value: "0",
        sub: "No tasks yet",
        glow: "rgba(148,163,184,0.03)",
        valueColor: "#f1f5f9",
        iconBg: "rgba(148,163,184,0.08)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    },
    {
        label: "Completed",
        value: "0",
        sub: "Keep going!",
        glow: "rgba(16,185,129,0.06)",
        valueColor: "#34d399",
        iconBg: "rgba(16,185,129,0.15)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
        label: "Focus Hours",
        value: "0h",
        sub: "Start a session",
        glow: "rgba(124,58,237,0.07)",
        valueColor: "#a78bfa",
        iconBg: "rgba(124,58,237,0.15)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
        label: "Day Streak",
        value: "0d",
        sub: "Build your habit",
        glow: "rgba(245,158,11,0.06)",
        valueColor: "#fcd34d",
        iconBg: "rgba(245,158,11,0.15)",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
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
            bg: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            glow: "rgba(124,58,237,0.3)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
        },
        {
            label: "Add New Task",
            desc: "Capture what needs to get done",
            path: "/tasks",
            bg: "linear-gradient(135deg, #4f46e5, #2563eb)",
            glow: "rgba(79,70,229,0.3)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
        },
        {
            label: "View Analytics",
            desc: "See your productivity trends",
            path: "/analytics",
            bg: "linear-gradient(135deg, #059669, #0d9488)",
            glow: "rgba(5,150,105,0.3)",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
        },
    ];

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">

            {/* ── Hero ── */}
            <div className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-2">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse-dot"
                        style={{ background: '#34d399', boxShadow: '0 0 0 0 rgba(52,211,153,0.5)' }}
                    />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">All systems go</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100">
                    Welcome back, <span style={{ color: '#a78bfa' }}>{firstName}</span> 🎯
                </h1>
                <p className="text-slate-500 mt-2 text-sm">Here's your productivity overview for today.</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div
                        key={s.label}
                        className={`animate-fade-in-up delay-${i + 1} rounded-2xl p-5 relative overflow-hidden cursor-default transition-all duration-300`}
                        style={{
                            background: '#0d1526',
                            border: '1px solid rgba(148,163,184,0.07)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${s.glow}`; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.07)'; }}
                    >
                        {/* Glow */}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${s.glow}, transparent 70%)` }} />
                        <div className="relative z-10">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: s.iconBg }}>
                                {s.icon}
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">{s.label}</p>
                            <p className="text-4xl font-bold" style={{ color: s.valueColor }}>{s.value}</p>
                            <p className="text-xs text-slate-700 mt-1">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Bottom Row ── */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* Quick Actions */}
                <div className="animate-fade-in-up delay-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Quick Actions</p>
                    <div className="space-y-2">
                        {quickActions.map(qa => (
                            <button
                                key={qa.label}
                                onClick={() => navigate(qa.path)}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200"
                                style={{ background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'; e.currentTarget.style.background = '#111d35'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.07)'; e.currentTarget.style.background = '#0d1526'; e.currentTarget.style.transform = ''; }}
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: qa.bg, boxShadow: `0 4px 12px ${qa.glow}` }}>
                                    {qa.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-slate-200 text-sm font-semibold">{qa.label}</p>
                                    <p className="text-slate-600 text-xs mt-0.5">{qa.desc}</p>
                                </div>
                                <svg className="ml-auto text-slate-700 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Focus Goal */}
                <div className="animate-fade-in-up delay-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Today's Focus Goal</p>
                    <div className="rounded-2xl p-6 h-full" style={{ background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                            >
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-200 text-sm font-semibold">Deep Work Goal</p>
                                <p className="text-slate-600 text-xs mt-0.5">4 hours target</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-slate-600 mb-2">
                                <span>0h completed</span>
                                <span className="text-slate-500">4h goal</span>
                            </div>
                            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(148,163,184,0.08)' }}>
                                <div
                                    className="h-2 rounded-full"
                                    style={{ width: '0%', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                                />
                            </div>
                        </div>

                        <p className="text-slate-700 text-xs">Start a focus session to track your progress here.</p>

                        <button
                            onClick={() => navigate("/focus")}
                            className="mt-4 flex items-center gap-2 text-xs font-semibold text-violet-400 transition-colors"
                            onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
                            onMouseLeave={e => e.currentTarget.style.color = '#a78bfa'}
                        >
                            Start session
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}