import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getTasks } from "../../services/taskService";
import { getNotifications, markNotificationRead, clearNotification } from "../../services/notificationService";
import { getPendingInvites, respondToInvite } from "../../services/podService";

const SHORTCUTS = [
    { label: "⚡ Focus Session Timer", path: "/focus", desc: "Start Pomodoro clock", keywords: ["focus", "timer", "pomodoro", "session", "work", "study"] },
    { label: "📊 Analytics Dashboard", path: "/analytics", desc: "View focus diagnostics", keywords: ["analytics", "dashboard", "stats", "charts", "ml", "coach"] },
    { label: "🗓️ Study baseline schedule", path: "/schedule", desc: "View baseline schedule", keywords: ["schedule", "calendar", "timetable", "baseline", "lifestyle"] },
    { label: "⚙️ User settings", path: "/settings", desc: "Manage timezone & display", keywords: ["settings", "profile", "password", "theme", "extension"] },
    { label: "📋 Tasks Manager", path: "/tasks", desc: "View and manage tasks", keywords: ["tasks", "todo", "list", "jobs", "backlog"] },
    { label: "👥 Social Pods", path: "/pods", desc: "Mutual accountability groups", keywords: ["pods", "social", "friends", "group", "accountability", "invite"] }
];

export default function Navbar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const downloadUrl = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) + "/api/download-extension" : apiBase + "/api/download-extension";

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    // Menu States
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSearchPalette, setShowSearchPalette] = useState(false);

    // Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [filteredShortcuts, setFilteredShortcuts] = useState([]);

    // Real Notifications List
    const [notifications, setNotifications] = useState([]);

    const notificationCount = notifications.filter(n => !n.read).length;

    // Pod Invites States
    const [pendingInvites, setPendingInvites] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const fetchInvites = () => {
            getPendingInvites().then(res => {
                setPendingInvites(res.data.invites || []);
            }).catch(err => {
                console.error("Error fetching invites in Navbar:", err);
            });
        };

        fetchInvites();
        const interval = setInterval(fetchInvites, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAcceptInvite = async (inviteId) => {
        try {
            await respondToInvite(inviteId, true);
            setPendingInvites(prev => prev.filter(i => i._id !== inviteId));
        } catch (e) {
            console.error("Error accepting invite:", e);
        }
    };

    const handleDeclineInvite = async (inviteId) => {
        try {
            await respondToInvite(inviteId, false);
            setPendingInvites(prev => prev.filter(i => i._id !== inviteId));
        } catch (e) {
            console.error("Error declining invite:", e);
        }
    };

    // Click Out Refs
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const searchRef = useRef(null);

    // Fetch Tasks for Search
    useEffect(() => {
        if (showSearchPalette) {
            getTasks().then(res => {
                setTasks(res.data.tasks || []);
            }).catch(() => {});
        }
    }, [showSearchPalette]);

    // Handle Search Filter
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTasks([]);
            setFilteredShortcuts([]);
            return;
        }
        const query = searchQuery.toLowerCase();
        
        const matches = tasks.filter(t => 
            (t.title || "").toLowerCase().includes(query) ||
            (t.priority || "").toLowerCase().includes(query)
        );
        setFilteredTasks(matches);

        const shortcutMatches = SHORTCUTS.filter(s =>
            s.label.toLowerCase().includes(query) ||
            s.desc.toLowerCase().includes(query) ||
            s.keywords.some(k => k.toLowerCase().includes(query))
        );
        setFilteredShortcuts(shortcutMatches);
    }, [searchQuery, tasks]);

    // Close Dropdowns on Click Outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchPalette(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Listen to Cmd+K or Ctrl+K shortcut keys
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setShowSearchPalette(prev => !prev);
            }
            if (e.key === "Escape") {
                setShowSearchPalette(false);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Load & Poll Notifications
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const fetchNotifs = () => {
            getNotifications().then(res => {
                if (res.data && res.data.success) {
                    setNotifications(res.data.notifications || []);
                }
            }).catch((err) => {
                console.error("Notifications fetch failed", err);
            });
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const markAllNotificationsRead = async () => {
        const unreadList = notifications.filter(n => !n.read);
        if (unreadList.length === 0) return;
        
        try {
            await Promise.all(unreadList.map(n => markNotificationRead(n._id)));
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error("Error marking all notifications read:", e);
        }
    };

    const handleNotificationClick = async (id, read) => {
        if (read) return;
        try {
            await markNotificationRead(id);
            setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (e) {
            console.error("Error marking read:", e);
        }
    };

    const handleClearNotification = async (id) => {
        try {
            await clearNotification(id);
            setNotifications(notifications.filter(n => n._id !== id));
        } catch (e) {
            console.error("Error clearing notification:", e);
        }
    };

    const formatTime = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHrs = Math.floor(diffMins / 60);
            if (diffHrs < 24) return `${diffHrs}h ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return "Just now";
        }
    };

    return (
        <>
            {/* Pending Invites Banner */}
            {pendingInvites.length > 0 && (
                <div className="bg-sky-500 text-white text-[11px] font-bold px-6 py-2 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md animate-fade-in">
                    <span className="truncate">
                        👥 You have been invited to join "{pendingInvites[0].podId?.name}" by {pendingInvites[0].fromUserId?.name}!
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={() => handleDeclineInvite(pendingInvites[0]._id)}
                            className="bg-sky-600 hover:bg-sky-700 px-2 py-0.5 rounded transition cursor-pointer text-white"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => handleAcceptInvite(pendingInvites[0]._id)}
                            className="bg-white text-sky-600 hover:bg-sky-50 px-2 py-0.5 rounded transition cursor-pointer"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            )}
            <header
                className="h-16 flex items-center justify-between px-6 sticky top-0 z-20 gap-4"
                style={{
                    background: 'var(--glass-bg)',
                    borderBottom: '1px solid var(--glass-border)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
            {/* Left Greeting */}
            <div className="min-w-0">
                <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm truncate">
                    {greeting}, <span className="text-sky-500 font-bold">{user?.name?.split(" ")[0] || "there"}</span> 👋
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">{dateStr}</p>
            </div>

            {/* Right Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0 relative">
                
                {/* Search Click Box (Desktop) */}
                <div
                    onClick={() => setShowSearchPalette(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 cursor-pointer transition-all duration-200 text-xs"
                    style={{ background: 'rgba(100, 116, 139, 0.05)', border: '1px solid var(--border-color)' }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span>Search tasks…</span>
                    <kbd className="ml-1 text-[9px] px-1.5 py-0.5 rounded font-mono bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">⌘K</kbd>
                </div>

                {/* Search Icon (Mobile) */}
                <button
                    onClick={() => setShowSearchPalette(true)}
                    className="flex sm:hidden w-9 h-9 items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer"
                    style={{ background: 'rgba(100, 116, 139, 0.05)', border: '1px solid var(--border-color)' }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                </button>

                {/* Download Extension Shortcut */}
                <a
                    href={downloadUrl}
                    title="Download Chrome Extension Companion"
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer hover:bg-sky-500/5 hover:border-sky-500/30"
                    style={{ background: 'rgba(100, 116, 139, 0.05)', border: '1px solid var(--border-color)' }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2z" />
                        <path d="M14 6V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2" />
                    </svg>
                </a>

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer"
                        style={{ background: 'rgba(100, 116, 139, 0.05)', border: '1px solid var(--border-color)' }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        
                        {/* Dot indicator */}
                        {notificationCount > 0 && (
                            <span
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse-dot"
                                style={{ background: '#38bdf8', boxShadow: '0 0 0 2px var(--bg-secondary)' }}
                            />
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div
                            className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl z-30 overflow-hidden border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                                {notificationCount > 0 && (
                                    <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition-colors cursor-pointer">
                                        Mark read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.length === 0 ? (
                                    <p className="p-4 text-center text-xs text-slate-500">No new notifications</p>
                                ) : (
                                    notifications.map(n => (
                                        <div 
                                            key={n._id} 
                                            onClick={() => handleNotificationClick(n._id, n.read)}
                                            className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                                                n.read ? 'opacity-60 hover:bg-slate-100 dark:hover:bg-slate-800/20' : 'bg-sky-500/5 hover:bg-sky-500/10'
                                            }`}
                                        >
                                            <span className="text-xs mt-0.5">
                                                {n.type === 'missed_session' ? '⚠️' : n.type === 'tip' ? '💡' : n.type === 'pod' ? '👥' : '⚡'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-relaxed ${n.read ? 'font-normal' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                                                    {n.message}
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleClearNotification(n._id); }} 
                                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm cursor-pointer leading-none shrink-0"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Avatar */}
                <div className="relative" ref={profileRef}>
                    <div
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all duration-200 overflow-hidden shrink-0"
                        style={{
                            background: 'var(--accent-gradient)',
                            boxShadow: '0 0 0 2px var(--border-color)',
                        }}
                    >
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    {showProfileMenu && (
                        <div
                            className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl z-30 overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                            {/* Profile Info block */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0" style={{ background: 'var(--accent-gradient)' }}>
                                    {user.profilePicture ? (
                                        <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{user?.name || "Focus User"}</p>
                                    {user?.username && (
                                        <p className="text-sky-500 text-[10px] font-bold truncate">@{user.username}</p>
                                    )}
                                    <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
                                </div>
                            </div>
                            
                            {/* Dropdown Options */}
                            <div className="p-1.5 space-y-0.5">
                                <button
                                    onClick={() => { setShowProfileMenu(false); navigate("/settings"); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    ⚙️ Settings
                                </button>
                                <button
                                    onClick={() => { setShowProfileMenu(false); navigate("/onboarding?edit=true"); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    🎓 Edit Student Profile
                                </button>
                                <button
                                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Command Palette Search Overlay */}
            {showSearchPalette && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-center p-4 sm:p-16 animate-fade-in">
                    <div
                        ref={searchRef}
                        className="w-full max-w-lg rounded-2xl shadow-2xl h-fit overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                        {/* Search Input block */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <svg className="text-slate-500 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Type to search tasks..."
                                className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm py-1 placeholder-slate-500"
                            />
                            <button
                                onClick={() => setShowSearchPalette(false)}
                                className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-slate-500 cursor-pointer"
                            >
                                ESC
                            </button>
                        </div>

                        {/* Search Results list */}
                        <div className="max-h-80 overflow-y-auto p-3.5 space-y-4">
                            {searchQuery.trim() === "" ? (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Quick Shortcuts</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SHORTCUTS.slice(0, 4).map((link, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => { setShowSearchPalette(false); navigate(link.path); }}
                                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-500/5 text-left cursor-pointer transition-all duration-200"
                                            >
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-255">{link.label}</p>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-450 mt-0.5">{link.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : filteredTasks.length === 0 && filteredShortcuts.length === 0 ? (
                                <p className="text-center text-xs text-slate-500 py-4">No matching tasks or pages found</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Matching Shortcuts/Pages Section */}
                                    {filteredShortcuts.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Matching Pages ({filteredShortcuts.length})</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {filteredShortcuts.map((link, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => { setShowSearchPalette(false); navigate(link.path); }}
                                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500/40 bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-500/5 text-left cursor-pointer transition-all duration-200"
                                                    >
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-255">{link.label}</p>
                                                        <p className="text-[9px] text-slate-500 dark:text-slate-450 mt-0.5">{link.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Matching Tasks Section */}
                                    {filteredTasks.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Matching Tasks ({filteredTasks.length})</p>
                                            <div className="space-y-1.5">
                                                {filteredTasks.map(t => (
                                                    <div
                                                        key={t._id}
                                                        onClick={() => { setShowSearchPalette(false); navigate("/tasks"); }}
                                                        className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800/60 hover:border-sky-500/40 bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-500/5 cursor-pointer transition-all duration-200"
                                                    >
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.title}</p>
                                                            {t.description && <p className="text-[9px] text-slate-500 dark:text-slate-450 mt-0.5 truncate max-w-xs">{t.description}</p>}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                            t.priority === 'Critical' ? 'bg-purple-500/15 text-purple-400' :
                                                            t.priority === 'High' ? 'bg-red-500/15 text-red-400' :
                                                            t.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                                                        }`}>
                                                            {t.priority}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
        </>
    );
}