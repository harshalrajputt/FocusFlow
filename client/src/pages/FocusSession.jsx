import { useState } from "react";

const MODES = [
    {
        label: "Focus", duration: 25,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
        ringColor: '#7c3aed', ringGlow: 'rgba(124,58,237,0.35)',
    },
    {
        label: "Short Break", duration: 5,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
        ringColor: '#10b981', ringGlow: 'rgba(16,185,129,0.3)',
    },
    {
        label: "Long Break", duration: 15,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
        ringColor: '#4f46e5', ringGlow: 'rgba(79,70,229,0.3)',
    },
];

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };

const FocusSession = () => {
    const [modeIdx, setModeIdx] = useState(0);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const mode = MODES[modeIdx];
    const total = mode.duration * 60;
    const remaining = total - elapsed;
    const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
    const secs = String(remaining % 60).padStart(2, "0");
    const progress = elapsed / total;

    const R = 88;
    const circ = 2 * Math.PI * R;
    const dash = circ - progress * circ;

    const switchMode = (i) => { setModeIdx(i); setRunning(false); setElapsed(0); };

    return (
        <div className="p-6 md:p-8 max-w-2xl mx-auto w-full space-y-8">

            {/* Header */}
            <div className="animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">Focus Session</h1>
                <p className="text-slate-600 text-sm mt-1">Deep work using the Pomodoro technique</p>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1.5 rounded-xl p-1.5 animate-fade-in-up delay-1" style={cardStyle}>
                {MODES.map((m, i) => (
                    <button
                        key={m.label}
                        onClick={() => switchMode(i)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={modeIdx === i
                            ? { background: `${m.ringColor}22`, color: m.ringColor, border: `1px solid ${m.ringColor}40` }
                            : { background: 'transparent', color: '#475569', border: '1px solid transparent' }
                        }
                    >
                        <span style={modeIdx === i ? { color: m.ringColor } : {}}>{m.icon}</span>
                        <span className="hidden sm:inline">{m.label}</span>
                    </button>
                ))}
            </div>

            {/* Timer Ring */}
            <div className="flex flex-col items-center gap-8 animate-fade-in-up delay-2">
                <div className="relative" style={{ width: 220, height: 220 }}>
                    {/* Glow behind ring */}
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: `radial-gradient(circle, ${mode.ringGlow} 0%, transparent 65%)`,
                            filter: 'blur(20px)',
                        }}
                    />
                    <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={mode.ringColor} />
                                <stop offset="100%" stopColor={mode.ringColor === '#7c3aed' ? '#4f46e5' : mode.ringColor === '#10b981' ? '#0d9488' : '#2563eb'} />
                            </linearGradient>
                        </defs>
                        {/* Track */}
                        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="8" />
                        {/* Progress */}
                        <circle
                            cx="110" cy="110" r={R}
                            fill="none"
                            stroke="url(#ringGrad)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={dash}
                            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }}
                        />
                    </svg>

                    {/* Timer text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono font-bold text-slate-100 text-5xl tracking-tight">{mins}:{secs}</span>
                        <span className="text-slate-600 text-sm mt-1 font-medium">{mode.label}</span>
                        {running && (
                            <span className="text-xs mt-2 font-semibold animate-pulse-dot" style={{ color: mode.ringColor }}>● Live</span>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-5">
                    {/* Reset */}
                    <button
                        onClick={() => { setElapsed(0); setRunning(false); }}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-slate-500 transition-all duration-200"
                        style={{ background: '#0d1526', border: '1px solid rgba(148,163,184,0.1)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={() => setRunning(!running)}
                        className="w-[70px] h-[70px] flex items-center justify-center rounded-full text-white transition-all duration-200"
                        style={{
                            background: `linear-gradient(135deg, ${mode.ringColor}, ${mode.ringColor === '#7c3aed' ? '#4f46e5' : mode.ringColor === '#10b981' ? '#0d9488' : '#2563eb'})`,
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
                        onClick={() => switchMode((modeIdx + 1) % MODES.length)}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-slate-500 transition-all duration-200"
                        style={{ background: '#0d1526', border: '1px solid rgba(148,163,184,0.1)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)'; }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    </button>
                </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in-up delay-3">
                {[
                    { label: "Sessions Today", value: "0" },
                    { label: "Total Focus", value: "0m" },
                    { label: "Best Streak", value: "0" },
                ].map(s => (
                    <div key={s.label} className="rounded-xl text-center py-4 px-3" style={cardStyle}>
                        <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                        <p className="text-slate-700 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FocusSession;