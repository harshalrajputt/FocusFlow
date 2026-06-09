const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const StatCard = ({ label, value, sub, icon, color, glow }) => (
    <div
        className="rounded-2xl p-5 relative overflow-hidden transition-all duration-300"
        style={cardStyle}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${glow}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${glow}, transparent 70%)` }} />
        <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '22' }}>{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-100">{value}</p>
            {sub && <p className="text-slate-700 text-xs mt-1">{sub}</p>}
        </div>
    </div>
);

const Analytics = () => {
    const maxH = 100;

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">Analytics</h1>
                    <p className="text-slate-600 text-sm mt-1">Track your productivity trends over time</p>
                </div>
                <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 text-sm self-start sm:self-auto"
                    style={cardStyle}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Last 7 days
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-1">
                <StatCard label="Focus Time" value="0h" sub="This week" color="#7c3aed" glow="rgba(124,58,237,0.1)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <StatCard label="Sessions" value="0" sub="Completed" color="#4f46e5" glow="rgba(79,70,229,0.1)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                />
                <StatCard label="Tasks Done" value="0" sub="This week" color="#10b981" glow="rgba(16,185,129,0.1)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                />
                <StatCard label="Avg. Session" value="—" sub="Minutes" color="#f59e0b" glow="rgba(245,158,11,0.1)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                />
            </div>

            {/* Bar chart */}
            <div className="rounded-2xl p-6 animate-fade-in-up delay-2" style={cardStyle}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider">Weekly Focus Hours</h2>
                    <span
                        className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                        This week
                    </span>
                </div>

                <div className="flex items-end gap-2" style={{ height: maxH + 32 }}>
                    {DAYS.map((day) => (
                        <div key={day} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full flex items-end justify-center" style={{ height: maxH }}>
                                {/* Placeholder empty bar */}
                                <div
                                    className="w-full max-w-[36px] rounded-t-lg transition-all duration-300"
                                    style={{ height: 3, background: 'rgba(148,163,184,0.07)', borderRadius: 4 }}
                                />
                            </div>
                            <span className="text-slate-700 text-xs">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
                    <p className="text-slate-700 text-xs text-center">No data yet — start your first focus session to see your charts.</p>
                </div>
            </div>

            {/* Two column row */}
            <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up delay-3">
                {/* Heatmap */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                    <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-4">Activity Heatmap</h2>
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 49 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-[18px] h-[18px] rounded-sm transition-all duration-200"
                                style={{ background: 'rgba(148,163,184,0.06)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(148,163,184,0.06)'}
                            />
                        ))}
                    </div>
                    <p className="text-slate-700 text-xs mt-4">Complete sessions to fill your activity map.</p>
                </div>

                {/* Best sessions */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                    <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-4">Top Performing Days</h2>
                    <div className="space-y-3">
                        {["Monday", "Wednesday", "Friday"].map((day, i) => (
                            <div key={day} className="flex items-center gap-3">
                                <span className="text-slate-700 text-xs w-6">{i + 1}.</span>
                                <span className="text-slate-500 text-sm flex-1">{day}</span>
                                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(148,163,184,0.06)' }}>
                                    <div className="h-1.5 rounded-full" style={{ width: '0%', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }} />
                                </div>
                                <span className="text-slate-700 text-xs w-8 text-right">0h</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-slate-700 text-xs mt-5">No sessions recorded yet.</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;