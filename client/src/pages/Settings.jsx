import { useState } from "react";

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };
const inputStyle = {
    width: '100%', background: '#0a1628', border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 12, color: '#f1f5f9', fontSize: 14, padding: '10px 14px',
    outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
};

const SECTIONS = [
    {
        id: "profile", label: "Profile",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
];

const Toggle = ({ defaultOn = false }) => {
    const [on, setOn] = useState(defaultOn);
    return (
        <button
            onClick={() => setOn(!on)}
            className="relative flex-shrink-0 transition-all duration-300"
            style={{ width: 44, height: 24, borderRadius: 12, background: on ? '#7c3aed' : '#1e293b', border: 'none', cursor: 'pointer' }}
        >
            <span
                className="absolute transition-all duration-300"
                style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white', top: 3,
                    left: on ? 23 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
            />
        </button>
    );
};

const Field = ({ label, hint, children }) => (
    <div className="flex items-center justify-between gap-4 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.05)' }}>
        <div className="min-w-0">
            <p className="text-slate-200 text-sm font-medium">{label}</p>
            {hint && <p className="text-slate-600 text-xs mt-0.5">{hint}</p>}
        </div>
        <div className="flex-shrink-0">{children}</div>
    </div>
);

const SaveButton = ({ label = "Save Changes" }) => (
    <div className="flex justify-end pt-4">
        <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)'}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {label}
        </button>
    </div>
);

const FInput = ({ type = "text", placeholder }) => {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type} placeholder={placeholder}
            style={{ ...inputStyle, borderColor: focused ? 'rgba(124,58,237,0.6)' : 'rgba(148,163,184,0.1)', boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
    );
};

const Settings = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [active, setActive] = useState("profile");

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            {/* Header */}
            <div className="animate-fade-in-up">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">Settings</h1>
                <p className="text-slate-600 text-sm mt-1">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 animate-fade-in-up delay-1">
                {/* Side nav */}
                <aside className="w-full md:w-52 flex-shrink-0">
                    <nav className="space-y-0.5">
                        {SECTIONS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActive(s.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                                style={active === s.id
                                    ? { background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }
                                    : { background: 'transparent', color: '#475569', border: '1px solid transparent' }
                                }
                                onMouseEnter={e => { if (active !== s.id) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(148,163,184,0.04)'; } }}
                                onMouseLeave={e => { if (active !== s.id) { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; } }}
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
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)', background: 'rgba(8,15,30,0.5)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <h2 className="text-slate-200 text-sm font-semibold">Profile Information</h2>
                            </div>
                            <div className="p-5">
                                {/* Avatar row */}
                                <div className="flex items-center gap-5 pb-5 mb-1" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                                    >
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="text-slate-200 text-sm font-semibold">{user?.name || "User"}</p>
                                        <p className="text-slate-600 text-xs mt-0.5">{user?.email || ""}</p>
                                        <button className="text-violet-400 text-xs mt-2 font-medium transition-colors" onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'} onMouseLeave={e => e.currentTarget.style.color = '#a78bfa'}>
                                            Change avatar →
                                        </button>
                                    </div>
                                </div>

                                <Field label="Full Name" hint="Your display name across the app">
                                    <div style={{ width: 220 }}><FInput placeholder={user?.name || "Your name"} /></div>
                                </Field>
                                <Field label="Email Address" hint="Used for login and notifications">
                                    <div style={{ width: 220 }}><FInput type="email" placeholder={user?.email || "you@example.com"} /></div>
                                </Field>
                                <Field label="Timezone" hint="For accurate time tracking">
                                    <select style={{ ...inputStyle, width: 220, cursor: 'pointer' }}>
                                        <option>UTC+05:30 — India</option>
                                        <option>UTC+00:00 — London</option>
                                        <option>UTC-05:00 — New York</option>
                                        <option>UTC-08:00 — LA</option>
                                    </select>
                                </Field>
                                <SaveButton />
                            </div>
                        </div>
                    )}

                    {/* Security */}
                    {active === "security" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)', background: 'rgba(8,15,30,0.5)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <h2 className="text-slate-200 text-sm font-semibold">Security</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Current Password" hint="Required to change password">
                                    <div style={{ width: 220 }}><FInput type="password" placeholder="••••••••" /></div>
                                </Field>
                                <Field label="New Password" hint="Minimum 8 characters">
                                    <div style={{ width: 220 }}><FInput type="password" placeholder="••••••••" /></div>
                                </Field>
                                <Field label="Confirm New Password">
                                    <div style={{ width: 220 }}><FInput type="password" placeholder="••••••••" /></div>
                                </Field>
                                <SaveButton label="Update Password" />
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    {active === "notifications" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)', background: 'rgba(8,15,30,0.5)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                                <h2 className="text-slate-200 text-sm font-semibold">Notifications</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Session reminders" hint="Remind you to start a focus session"><Toggle defaultOn={true} /></Field>
                                <Field label="Task due alerts" hint="Notify when tasks are approaching due date"><Toggle defaultOn={true} /></Field>
                                <Field label="Weekly summary" hint="A productivity report every week"><Toggle defaultOn={false} /></Field>
                                <Field label="Break reminders" hint="Prompt you to take breaks between sessions"><Toggle defaultOn={true} /></Field>
                                <Field label="Sound effects" hint="Play sounds during sessions"><Toggle defaultOn={true} /></Field>
                            </div>
                        </div>
                    )}

                    {/* Appearance */}
                    {active === "appearance" && (
                        <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={cardStyle}>
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)', background: 'rgba(8,15,30,0.5)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                <h2 className="text-slate-200 text-sm font-semibold">Appearance</h2>
                            </div>
                            <div className="p-5">
                                <Field label="Theme" hint="Choose your preferred color theme">
                                    <select style={{ ...inputStyle, width: 180, cursor: 'pointer' }}>
                                        <option>Dark (default)</option>
                                        <option>Light</option>
                                        <option>System</option>
                                    </select>
                                </Field>
                                <Field label="Compact sidebar" hint="Collapse the sidebar by default"><Toggle /></Field>
                                <Field label="Reduce motion" hint="Minimize animations across the app"><Toggle /></Field>
                                <Field label="Dense layout" hint="Fit more content on screen"><Toggle /></Field>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;