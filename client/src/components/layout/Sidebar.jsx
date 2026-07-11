import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FocusFlowIcon from "../../assets/FocusFlowIcon.png";

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
        name: "Flashcards", path: "/flashcards",
        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
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

export default function Sidebar({ mobileOpen, onMobileClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Dynamic state synced with body class
    const [isCompact, setIsCompact] = useState(() => document.body.classList.contains("compact-sidebar"));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsCompact(document.body.classList.contains("compact-sidebar"));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // Close mobile sidebar on route change
    useEffect(() => {
        if (onMobileClose) onMobileClose();
    }, [location.pathname, location.search]);

    const isItemActive = (item) => {
        return item.path.includes('?')
            ? (location.pathname + location.search) === item.path
            : location.pathname === item.path && !location.search.includes('tab=');
    };

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    // Shared sidebar content
    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5 group" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="relative flex-shrink-0">
                    <div className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-sky-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                    <img 
                        src={FocusFlowIcon} 
                        alt="FocusFlow Logo" 
                        className="relative w-9 h-9 object-contain flex-shrink-0 rounded-xl transition-transform duration-300 group-hover:scale-110"
                    />
                </div>
                <AnimatePresence initial={false}>
                    {!isCompact && (
                        <motion.span 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 brand-name whitespace-nowrap overflow-hidden"
                        >
                            Focus<span className="text-sky-500 dark:text-sky-400">Flow</span>
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Close button — mobile only */}
                {onMobileClose && (
                    <button
                        onClick={onMobileClose}
                        className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label="Close sidebar"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
                <AnimatePresence initial={false}>
                    {!isCompact && (
                        <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 whitespace-nowrap overflow-hidden"
                        >
                            Navigation
                        </motion.p>
                    )}
                </AnimatePresence>

                {menuItems.map((item) => {
                    const active = isItemActive(item);
                    return (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative no-underline group
                                ${active
                                    ? 'text-sky-600 dark:text-sky-400 border border-sky-500/15 dark:border-sky-400/20'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent hover:border-[var(--border-hover)]'
                                }`}
                            style={active ? {
                                background: 'var(--accent-glow)',
                                boxShadow: '0 2px 12px var(--accent-glow)',
                            } : {}}
                        >
                            {/* Active gradient bar */}
                            {active && (
                                <span
                                    className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full"
                                    style={{ background: 'var(--accent-gradient)' }}
                                />
                            )}
                            <span className={`flex-shrink-0 transition-all duration-300 ${active ? 'text-sky-500 scale-110' : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300 group-hover:scale-110'}`}>
                                {item.icon}
                            </span>
                            <AnimatePresence initial={false}>
                                {!isCompact && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="whitespace-nowrap overflow-hidden"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {active && !isCompact && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse-dot" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div className="px-3 pb-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
                {/* User card */}
                <div
                    className="flex items-center gap-3 px-3 py-3 rounded-xl mt-3 mb-1 overflow-hidden"
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
                    <AnimatePresence initial={false}>
                        {!isCompact && (
                            <motion.div 
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="min-w-0 flex-1 overflow-hidden"
                            >
                                <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold truncate">{user?.name || "User"}</p>
                                {user?.username && (
                                    <p className="text-sky-500 text-xs truncate font-semibold">@{user.username}</p>
                                )}
                                <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user?.email || ""}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all duration-200 cursor-pointer"
                    style={{ justifyContent: isCompact ? 'center' : 'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = ''; }}
                >
                    <span className="flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                    </span>
                    <AnimatePresence initial={false}>
                        {!isCompact && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap overflow-hidden"
                            >
                                Logout
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* ── DESKTOP SIDEBAR (always visible on md+) ── */}
            <motion.aside
                animate={{ width: isCompact ? 76 : 256 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="motion-aside sidebar-desktop flex-shrink-0 flex flex-col min-h-screen relative overflow-hidden"
                style={{ 
                    background: 'var(--bg-secondary)', 
                    borderRight: '1px solid var(--border-color)',
                    zIndex: 10
                }}
            >
                {sidebarContent}
            </motion.aside>

            {/* ── MOBILE SIDEBAR OVERLAY ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="sidebar-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={onMobileClose}
                            className="sidebar-mobile-backdrop"
                        />
                        {/* Drawer */}
                        <motion.aside
                            key="sidebar-drawer"
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", stiffness: 280, damping: 30 }}
                            className="sidebar-mobile flex flex-col"
                            style={{ 
                                background: 'var(--bg-secondary)', 
                                borderRight: '1px solid var(--border-color)',
                            }}
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}