import { NavLink, useNavigate, useLocation } from "react-router-dom";


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
        name: "Social Pods", path: "/pods",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
        name: "Extension", path: "/settings?tab=extension",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2h-3.18A5.5 5.5 0 0 0 12 2a5.5 5.5 0 0 0-3.82 4H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3.18A5.5 5.5 0 0 0 12 22a5.5 5.5 0 0 0 3.82-4H19a2 2 0 0 0 2-2z"/></svg>
    },
    {
        name: "Settings", path: "/settings",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    },

];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const isItemActive = (item) => {
        const itemPath = item.path;
        const currentPath = location.pathname + location.search;
        
        if (itemPath.includes('?')) {
            return currentPath === itemPath;
        } else {
            return location.pathname === itemPath && !location.search.includes('tab=');
        }
    };


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
            className="w-64 flex-shrink-0 flex flex-col min-h-screen transition-all duration-200"
            style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}
        >
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                    style={{
                        background: 'var(--accent-gradient)',
                        boxShadow: '0 4px 12px var(--accent-glow)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" />
                        <polyline points="12 7 12 12 15.5 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 brand-name">
                    Focus<span className="text-sky-500 dark:text-sky-400">Flow</span>
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">Menu</p>
                {menuItems.map(item => {
                    const active = isItemActive(item);
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative no-underline group
                                ${active
                                    ? 'text-sky-600 dark:text-sky-400 border border-sky-500/10 dark:border-sky-400/20'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/60'
                                }`}
                            style={active ? {
                                background: 'var(--accent-glow)',
                            } : {}}
                        >
                            {/* Active bar */}
                            {active && (
                                <span
                                    className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r-full"
                                    style={{ background: 'var(--accent-color)' }}
                                />
                            )}
                            <span className={`transition-colors ${active ? 'text-sky-500' : 'text-slate-600 dark:text-slate-500 group-hover:text-slate-850 dark:group-hover:text-slate-300'}`}>
                                {item.icon}
                            </span>
                            <span>{item.name}</span>
                            {active && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                {/* User card */}
                <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl mt-3 mb-1"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                        style={{ background: 'var(--accent-gradient)' }}
                    >
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold truncate">{user?.name || "User"}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user?.email || ""}</p>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all duration-200 cursor-pointer"
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