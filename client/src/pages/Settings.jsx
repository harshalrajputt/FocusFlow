import { useState, useEffect, useRef } from "react";

import { useSearchParams } from "react-router-dom";
import { getProfile, upsertProfile } from "../services/profileService";


import { updateUserProfile, updateUserPassword } from "../services/authService";
import { applyAppearanceSettings } from "../utils/theme";
import ProtectedBlocksManager from "../components/schedule/ProtectedBlocksManager";

const cardStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };
const inputStyle = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, padding: '10px 14px',
    outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
};

const SECTIONS = [
    {
        id: "profile", label: "Profile",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
    {
        id: "lifestyle", label: "Lifestyle Blocks",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    },
    {
        id: "security", label: "Security",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    },
    {
        id: "notifications", label: "Notifications",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    },
    {
        id: "appearance", label: "Appearance",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    },
    {
        id: "extension", label: "Extension",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2h-3.18A5.5 5.5 0 0 0 12 2a5.5 5.5 0 0 0-3.82 4H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3.18A5.5 5.5 0 0 0 12 22a5.5 5.5 0 0 0 3.82-4H19a2 2 0 0 0 2-2z"/></svg>
    }
];

const Toggle = ({ checked, onChange }) => {
    return (
        <button
            type="button"
            onClick={onChange}
            className="relative flex-shrink-0 transition-all duration-300"
            style={{ width: 44, height: 24, borderRadius: 12, background: checked ? 'var(--accent-color)' : 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}
        >
            <span
                className="absolute transition-all duration-300"
                style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white', top: 3,
                    left: checked ? 23 : 3, boxShadow: 'var(--shadow-sm)',
                }}
            />
        </button>
    );
};

const Field = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="min-w-0">
            <p className="text-slate-900 dark:text-slate-200 text-sm font-medium">{label}</p>
            {hint && <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{hint}</p>}
        </div>
        <div className="flex-shrink-0">{children}</div>
    </div>
);

const SaveButton = ({ label = "Save Changes", loading = false }) => (
    <div className="flex justify-end pt-4">
        <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)'; }}
        >
            {loading ? (
                <>
                    <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving...
                </>
            ) : (
                <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    {label}
                </>
            )}
        </button>
    </div>
);

const FInput = ({ type = "text", placeholder, value, onChange, required = false }) => {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
            style={{ ...inputStyle, borderColor: focused ? 'var(--accent-color)' : 'var(--border-color)', boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
    );
};

// Toast notification
function Toast({ toast }) {
    if (!toast) return null;
    const colors = {
        success: { bg: 'var(--accent-glow)', border: 'var(--accent-color)', color: 'var(--accent-color)' },
        error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171' },
    };
    const c = colors[toast.type] || colors.success;
    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxWidth: 320 }}
        >
            {toast.type === 'success'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            }
            {toast.message}
        </div>
    );
}

const Settings = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const downloadUrl = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) + "/api/download-extension" : apiBase + "/api/download-extension";

    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const [active, setActive] = useState(() => {
        return tabParam && ["profile", "lifestyle", "security", "notifications", "appearance", "extension"].includes(tabParam) ? tabParam : "profile";
    });

    useEffect(() => {
        if (tabParam && ["profile", "lifestyle", "security", "notifications", "appearance", "extension"].includes(tabParam)) {
            setActive(tabParam);
        }
    }, [tabParam]);

    
    // Profile states
    const [name, setName] = useState(user.name || "");
    const [username, setUsername] = useState(user.username || "");
    const [email, setEmail] = useState(user.email || "");
    const [timezone, setTimezone] = useState(user.timezone || "UTC+05:30 — India");
    const [profilePicture, setProfilePicture] = useState(user.profilePicture || "");
    const fileInputRef = useRef(null);

    // Security states
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });

    // Preferences states
    const [notifications, setNotifications] = useState({
        sessionReminders: user.settings?.notifications?.sessionReminders ?? true,
        taskDueAlerts:    user.settings?.notifications?.taskDueAlerts ?? true,
        weeklySummary:    user.settings?.notifications?.weeklySummary ?? false,
        breakReminders:   user.settings?.notifications?.breakReminders ?? true,
        soundEffects:     user.settings?.notifications?.soundEffects ?? true
    });

    const [appearance, setAppearance] = useState({
        theme:          user.settings?.appearance?.theme ?? "Dark (default)",
        compactSidebar: user.settings?.appearance?.compactSidebar ?? false,
        reduceMotion:   user.settings?.appearance?.reduceMotion ?? false,
        denseLayout:    user.settings?.appearance?.denseLayout ?? false
    });

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Custom Extra Details states
    const [customType, setCustomType] = useState("");
    const [customDescription, setCustomDescription] = useState("");
    const [loadingCustom, setLoadingCustom] = useState(false);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!name.trim() || !username.trim() || !email.trim()) {
            showToast("Name, username, and email are required", "error");
            return;
        }
        setLoading(true);
        try {
            const res = await updateUserProfile({ name, username, email, timezone, profilePicture });
            if (res.data.success) {
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = { ...currentUser, ...res.data.user };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                showToast("Profile updated successfully");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast("Image size must be less than 2MB", "error");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePicture(reader.result);
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        // Load UserProfile for custom details
        getProfile().then(res => {
            if (res.data && res.data.data) {
                const profile = res.data.data;
                if (profile.customDetails) {
                    setCustomType(profile.customDetails.type || "");
                    setCustomDescription(profile.customDetails.description || "");
                }
            }
        }).catch(err => {
            console.error("Failed to load user profile details", err);
        });
    }, []);

    const handleSaveCustomDetails = async (e) => {
        e.preventDefault();
        setLoadingCustom(true);
        try {
            const res = await upsertProfile({
                customDetails: {
                    type: customType,
                    description: customDescription
                }
            });
            if (res.data.success) {
                showToast("Extra details saved successfully");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save details", "error");
        } finally {
            setLoadingCustom(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmNewPassword } = passwords;
        if (!currentPassword || !newPassword) {
            showToast("All password fields are required", "error");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showToast("New passwords do not match", "error");
            return;
        }
        if (newPassword.length < 8) {
            showToast("New password must be at least 8 characters", "error");
            return;
        }
        setLoading(true);
        try {
            const res = await updateUserPassword({ currentPassword, newPassword });
            if (res.data.success) {
                showToast("Password updated successfully");
                setPasswords({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update password", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotification = async (key) => {
        const nextVal = !notifications[key];
        const nextNotifications = { ...notifications, [key]: nextVal };
        setNotifications(nextNotifications);
        
        try {
            const res = await updateUserProfile({
                settings: {
                    notifications: nextNotifications
                }
            });
            if (res.data.success) {
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = { ...currentUser, ...res.data.user };
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
        } catch (err) {
            showToast("Failed to save notification preference", "error");
            setNotifications(notifications); // revert
        }
    };

    const handleToggleAppearance = async (key, val) => {
        const nextVal = val !== undefined ? val : !appearance[key];
        const nextAppearance = { ...appearance, [key]: nextVal };
        setAppearance(nextAppearance);
        
        // Apply instantly to the DOM
        try {
            applyAppearanceSettings(nextAppearance);
        } catch (e) {
            console.error("Failed to apply theme instantly", e);
        }
        
        try {
            const res = await updateUserProfile({
                settings: {
                    appearance: nextAppearance
                }
            });
            if (res.data.success) {
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const updatedUser = { ...currentUser, ...res.data.user };
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
        } catch (err) {
            showToast("Failed to save appearance preference", "error");
            // Revert DOM change
            try {
                applyAppearanceSettings(appearance);
            } catch (e) {}
            setAppearance(appearance); // revert
        }
    };

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            {/* Header */}
            <div className="animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 animate-fade-in-up delay-1">
                {/* Side nav */}
                <aside className="w-full md:w-52 flex-shrink-0">
                    <nav className="space-y-0.5">
                        {SECTIONS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setActive(s.id);
                                    setSearchParams({ tab: s.id });
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                                style={active === s.id
                                    ? { background: 'var(--accent-glow)', color: 'var(--accent-color)', border: '1px solid var(--border-color)' }
                                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }
                                }
                                onMouseEnter={e => { if (active !== s.id) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--border-color)'; } }}
                                onMouseLeave={e => { if (active !== s.id) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; } }}
                            >
                                <span>{s.icon}</span>
                                {s.label}
                                <svg className="ml-auto opacity-30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <div className="flex-1 min-w-0">

                    {/* Profile */}
                    {active === "profile" && (
                        <div className="space-y-6">
                            <form onSubmit={handleSaveProfile} className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Profile Information</h2>
                                </div>
                                <div className="p-5">
                                    {/* Avatar row */}
                                    <div className="flex items-center gap-5 pb-5 mb-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden"
                                            style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                                        >
                                            {profilePicture ? (
                                                <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                initials
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">{user?.name || "User"}</p>
                                            <p className="text-slate-550 dark:text-slate-450 text-xs mt-0.5">{user?.email || ""}</p>
                                            <button 
                                                type="button" 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-sky-500 hover:text-sky-600 text-xs mt-2 font-medium transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                Change avatar →
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    <Field label="Full Name" hint="Your display name across the app">
                                        <div style={{ width: 220 }}>
                                            <FInput value={name} onChange={e => setName(e.target.value)} required={true} placeholder="Your name" />
                                        </div>
                                    </Field>
                                    <Field label="Username" hint="Your unique handle (@username)">
                                        <div style={{ width: 220 }}>
                                            <FInput value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required={true} placeholder="username" />
                                        </div>
                                    </Field>
                                    <Field label="Email Address" hint="Used for login and notifications">
                                        <div style={{ width: 220 }}>
                                            <FInput type="email" value={email} onChange={e => setEmail(e.target.value)} required={true} placeholder="you@example.com" />
                                        </div>
                                    </Field>
                                    <Field label="Timezone" hint="For accurate time tracking">
                                        <select
                                            value={timezone}
                                            onChange={e => setTimezone(e.target.value)}
                                            style={{ ...inputStyle, width: 220, cursor: 'pointer' }}
                                        >
                                            <option value="UTC+05:30 — India">UTC+05:30 — India</option>
                                            <option value="UTC+00:00 — London">UTC+00:00 — London</option>
                                            <option value="UTC-05:00 — New York">UTC-05:00 — New York</option>
                                            <option value="UTC-08:00 — LA">UTC-08:00 — LA</option>
                                        </select>
                                    </Field>
                                    <SaveButton loading={loading} />
                                </div>
                            </form>

                            {/* Extra Details Card */}
                            <form onSubmit={handleSaveCustomDetails} className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Extra Custom Details</h2>
                                </div>
                                <div className="p-5">
                                    <p className="text-xs text-slate-500 mb-4">
                                        Share additional details about your study style, classes, or timing constraints to help generate a more specific weekly schedule table for you.
                                    </p>
                                    <Field label="Detail Type" hint="e.g., Exam Prep, Research, Job Shift">
                                        <div style={{ width: 220 }}>
                                            <FInput value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Type of detail" />
                                        </div>
                                    </Field>
                                    <Field label="Description" hint="Describe your schedule/needs in detail">
                                        <div style={{ width: 220 }}>
                                            <textarea 
                                                value={customDescription} 
                                                onChange={e => setCustomDescription(e.target.value)} 
                                                placeholder="e.g. Preparing for GRE, morning shifts on Mon/Wed..."
                                                style={{ ...inputStyle, width: 220, resize: 'none', height: 80 }}
                                            />
                                        </div>
                                    </Field>
                                    <SaveButton label="Save Extra Details" loading={loadingCustom} />
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Security */}
                    {active === "security" && (
                        <form onSubmit={handleSavePassword} className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Security</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Current Password" hint="Required to change password">
                                    <div style={{ width: 220 }}>
                                        <FInput type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required={true} placeholder="••••••••" />
                                    </div>
                                </Field>
                                <Field label="New Password" hint="Minimum 8 characters">
                                    <div style={{ width: 220 }}>
                                        <FInput type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required={true} placeholder="••••••••" />
                                    </div>
                                </Field>
                                <Field label="Confirm New Password">
                                    <div style={{ width: 220 }}>
                                        <FInput type="password" value={passwords.confirmNewPassword} onChange={e => setPasswords({ ...passwords, confirmNewPassword: e.target.value })} required={true} placeholder="••••••••" />
                                    </div>
                                </Field>
                                <SaveButton label="Update Password" loading={loading} />
                            </div>
                        </form>
                    )}

                    {/* Notifications */}
                    {active === "notifications" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Notifications</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Session reminders" hint="Remind you to start a focus session">
                                    <Toggle checked={notifications.sessionReminders} onChange={() => handleToggleNotification("sessionReminders")} />
                                </Field>
                                <Field label="Task due alerts" hint="Notify when tasks are approaching due date">
                                    <Toggle checked={notifications.taskDueAlerts} onChange={() => handleToggleNotification("taskDueAlerts")} />
                                </Field>
                                <Field label="Weekly summary" hint="A productivity report every week">
                                    <Toggle checked={notifications.weeklySummary} onChange={() => handleToggleNotification("weeklySummary")} />
                                </Field>
                                <Field label="Break reminders" hint="Prompt you to take breaks between sessions">
                                    <Toggle checked={notifications.breakReminders} onChange={() => handleToggleNotification("breakReminders")} />
                                </Field>
                                <Field label="Sound effects" hint="Play sounds during sessions">
                                    <Toggle checked={notifications.soundEffects} onChange={() => handleToggleNotification("soundEffects")} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* Appearance */}
                    {active === "appearance" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Appearance</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Theme" hint="Choose your preferred color theme">
                                    <select
                                        value={appearance.theme}
                                        onChange={e => handleToggleAppearance("theme", e.target.value)}
                                        style={{ ...inputStyle, width: 180, cursor: 'pointer' }}
                                    >
                                        <option value="Dark (default)">Dark (default)</option>
                                        <option value="Light">Light</option>
                                        <option value="System">System</option>
                                    </select>
                                </Field>
                                <Field label="Compact sidebar" hint="Collapse the sidebar by default">
                                    <Toggle checked={appearance.compactSidebar} onChange={() => handleToggleAppearance("compactSidebar")} />
                                </Field>
                                <Field label="Reduce motion" hint="Minimize animations across the app">
                                    <Toggle checked={appearance.reduceMotion} onChange={() => handleToggleAppearance("reduceMotion")} />
                                </Field>
                                <Field label="Dense layout" hint="Fit more content on screen">
                                    <Toggle checked={appearance.denseLayout} onChange={() => handleToggleAppearance("denseLayout")} />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* Extension */}
                    {active === "extension" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2h-3.18A5.5 5.5 0 0 0 12 2a5.5 5.5 0 0 0-3.82 4H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3.18A5.5 5.5 0 0 0 12 22a5.5 5.5 0 0 0 3.82-4H19a2 2 0 0 0 2-2z"/></svg>
                                <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Browser Extension Companion</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <div className="flex items-start gap-4">
                                        <span className="text-3xl mt-0.5">🧩</span>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-250">FocusFlow Blocker Shield</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed max-w-md">
                                                Active tracking extension. Syncs with your dashboard tasks, logs focus times to your profile, and blocks distraction domains (YouTube, Instagram) automatically.
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={downloadUrl}
                                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg shadow-sky-500/15 whitespace-nowrap self-stretch sm:self-auto no-underline"
                                        style={{ background: 'var(--accent-gradient)' }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px var(--accent-glow)'; e.currentTarget.style.transform = ''; }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        Download Blocker Extension
                                    </a>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Crystal Clear Installation Guide</h3>
                                    
                                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-6 ml-3 space-y-6">
                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900" style={{ background: 'var(--accent-color)' }}>1</span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-255">Download the Zip Bundle</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                Click the **Download Blocker Extension** button above. Save the file <code className="text-sky-600 dark:text-sky-400 font-mono">focusflow-companion.zip</code> to your computer.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900" style={{ background: 'var(--accent-color)' }}>2</span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-255">Extract the Archive</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                Right-click the downloaded zip file and select **Extract All...** to extract the folder. Keep a note of where you extracted it.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900" style={{ background: 'var(--accent-color)' }}>3</span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-255">Open Chrome Extension Manager</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                In your Google Chrome URL address bar, navigate to <code className="text-sky-600 dark:text-sky-400 font-mono">chrome://extensions/</code> or click **Extensions Manager** in your browser menu.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900" style={{ background: 'var(--accent-color)' }}>4</span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-255">Toggle "Developer Mode"</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                Turn on the **Developer mode** toggle switch in the top-right corner of the Extensions Manager screen.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900" style={{ background: 'var(--accent-color)' }}>5</span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-255">Load the Unpacked Folder</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                Click the **Load unpacked** button in the top-left corner. In the file explorer, select the folder containing your extracted extension files (ensure you select the folder containing the <code className="text-sky-600 dark:text-sky-400 font-mono">manifest.json</code> file).
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute -left-9 top-0.5 flex items-center justify-center w-5.5 h-5.5 rounded-full bg-emerald-600 text-slate-100 text-[10px] font-black border-2 border-white dark:border-slate-900">✓</span>
                                            <p className="text-xs font-bold text-emerald-500">All Set! Connect Your Account</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                                                Open the extension popup in your extensions bar, enter your FocusFlow account details to log in, and sync with your target tasks list instantly!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lifestyle Blocks */}
                    {active === "lifestyle" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                <h2 className="text-slate-900 dark:text-slate-200 text-sm font-semibold">Lifestyle & Leisure Blocks</h2>
                            </div>
                            <div className="p-5">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                    Define recurring activities (e.g., Gym, gaming, or social commitments) where you want to protect your calendar from being scheduled for work or study. FocusFlow will automatically build your schedule around these blocks.
                                </p>
                                <ProtectedBlocksManager />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <Toast toast={toast} />
        </div>
    );
};

export default Settings;