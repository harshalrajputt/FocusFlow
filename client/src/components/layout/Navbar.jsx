export default function Navbar() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <header
            className="h-16 flex items-center justify-between px-6 sticky top-0 z-20 gap-4"
            style={{
                background: 'rgba(8,15,30,0.85)',
                borderBottom: '1px solid rgba(148,163,184,0.07)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            {/* Left */}
            <div className="min-w-0">
                <p className="text-slate-100 font-semibold text-sm truncate">
                    {greeting}, <span className="text-violet-300">{user?.name?.split(" ")[0] || "there"}</span> 👋
                </p>
                <p className="text-slate-600 text-xs mt-0.5">{dateStr}</p>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search bar */}
                <div
                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 cursor-pointer transition-all duration-200 text-xs"
                    style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.08)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.08)'}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span className="text-slate-600">Search…</span>
                    <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(148,163,184,0.08)', color: '#475569' }}>⌘K</kbd>
                </div>

                {/* Bell */}
                <button
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 transition-all duration-200"
                    style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.08)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.14)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.08)'; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {/* Dot */}
                    <span
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ background: '#7c3aed', boxShadow: '0 0 0 2px #080f1e' }}
                    />
                </button>

                {/* Avatar */}
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all duration-200"
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        boxShadow: '0 0 0 2px rgba(124,58,237,0.25)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.25)'}
                >
                    {initials}
                </div>
            </div>
        </header>
    );
}