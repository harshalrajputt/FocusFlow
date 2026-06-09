import { NavLink, useNavigate } from "react-router-dom";

const menuItems = [
    {
        name: "Dashboard", path: "/dashboard",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    },
    {
        name: "Tasks", path: "/tasks",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    },
    {
        name: "Focus Session", path: "/focus",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    },
    {
        name: "Analytics", path: "/analytics",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
    {
        name: "Schedule", path: "/schedule",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    },
    {
        name: "Settings", path: "/settings",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    return (
        <aside
            className="w-64 flex-shrink-0 flex flex-col min-h-screen"
            style={{ background: '#080f1e', borderRight: '1px solid rgba(148,163,184,0.07)' }}
        >
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" />
                        <polyline points="12 7 12 12 15.5 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span className="text-lg font-extrabold tracking-tight text-slate-100">
                    Focus<span className="text-violet-400">Flow</span>
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">Menu</p>
                {menuItems.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative no-underline group
                            ${isActive
                                ? 'text-violet-300 border border-violet-500/20'
                                : 'text-slate-500 hover:text-slate-200 border border-transparent hover:border-slate-800/60'
                            }`
                        }
                        style={({ isActive }) => isActive ? {
                            background: 'rgba(124,58,237,0.12)',
                        } : {}}
                    >
                        {({ isActive }) => (
                            <>
                                {/* Active bar */}
                                {isActive && (
                                    <span
                                        className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r-full"
                                        style={{ background: '#7c3aed' }}
                                    />
                                )}
                                <span className={`transition-colors ${isActive ? 'text-violet-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                    {item.icon}
                                </span>
                                <span>{item.name}</span>
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(148,163,184,0.07)' }}>
                {/* User card */}
                <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl mt-3 mb-1"
                    style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.06)' }}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-200 text-sm font-semibold truncate">{user?.name || "User"}</p>
                        <p className="text-slate-600 text-xs truncate">{user?.email || ""}</p>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 transition-all duration-200"
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = ''; }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                </button>
            </div>
        </aside>
    );
}