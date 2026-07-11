import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerUser } from "../../services/authService";

const inputBase = "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] outline-none transition-all duration-200 pl-10 pr-4 py-3";

export default function RegisterForm() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: "", username: "", email: "", password: "", confirmPassword: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setError("");
        let value = e.target.value;
        if (e.target.name === "username") {
            value = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
        }
        setFormData({ ...formData, [e.target.name]: value });
    };

    // Password strength
    const getStrength = (p) => {
        if (!p) return { score: 0, label: "", colors: [] };
        let s = 0;
        if (p.length >= 8) s++;
        if (/[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p)) s++;
        const labels = ["", "Weak", "Fair", "Good", "Strong"];
        const barColors = [
            ["#ef4444", "var(--border-color)", "var(--border-color)", "var(--border-color)"],
            ["#f59e0b", "#f59e0b", "var(--border-color)", "var(--border-color)"],
            ["#3b82f6", "#3b82f6", "#3b82f6", "var(--border-color)"],
            ["#10b981", "#10b981", "#10b981", "#10b981"],
        ];
        return { score: s, label: labels[s], colors: barColors[s - 1] || ["var(--border-color)", "var(--border-color)", "var(--border-color)", "var(--border-color)"] };
    };
    const strength = getStrength(formData.password);

    const pwdMatch = formData.confirmPassword && formData.password === formData.confirmPassword;
    const pwdMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

    const focusStyle = (e) => {
        e.target.style.borderColor = 'var(--accent-color)';
        e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
    };
    const blurStyle = (e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; };

    const eyeBtnStyle = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
        setLoading(true); setError("");
        try {
            const response = await registerUser({ name: formData.name, username: formData.username, email: formData.email, password: formData.password });
            console.log(response.data);
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally { setLoading(false); }
    };

    const EyeIcon = ({ open }) => open ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    );

    const LockIcon = () => (
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error */}
            {error && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Name */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Full Name</label>
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required className={inputBase} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
            </div>

            {/* Username */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Username</label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-sm font-semibold">@</span>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="username" required className={inputBase} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Email Address</label>
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required className={inputBase} onFocus={focusStyle} onBlur={blurStyle} />
                </div>
            </div>

            {/* Password */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Password</label>
                <div className="relative">
                    <LockIcon />
                    <input
                        type={showPwd ? "text" : "password"} name="password" value={formData.password}
                        onChange={handleChange} placeholder="Min. 8 characters" required
                        className={`${inputBase} pr-11`}
                        onFocus={focusStyle} onBlur={blurStyle}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="text-slate-600 hover:text-slate-300 transition-colors"
                        style={eyeBtnStyle}
                    >
                        <EyeIcon open={showPwd} />
                    </button>
                </div>
                {/* Strength meter */}
                {formData.password && (
                    <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                            {strength.colors.map((color, i) => (
                                <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: color }} />
                            ))}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{strength.label} password</p>
                    </div>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Confirm Password</label>
                <div className="relative">
                    <LockIcon />
                    <input
                        type={showConfirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                        onChange={handleChange} placeholder="Repeat your password" required
                        className={`w-full bg-[var(--bg-primary)] border rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] outline-none transition-all duration-200 pl-10 pr-11 py-3 ${pwdMismatch ? 'border-red-500/50' : pwdMatch ? 'border-emerald-500/50' : 'border-[var(--border-color)]'}`}
                        onFocus={focusStyle} onBlur={blurStyle}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-slate-600 hover:text-slate-300 transition-colors"
                        style={eyeBtnStyle}
                    >
                        <EyeIcon open={showConfirm} />
                    </button>
                    {pwdMatch && (
                        <svg className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                </div>
            </div>

            {/* Submit */}
            <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/10 disabled:opacity-55 disabled:cursor-not-allowed mt-2 cursor-pointer"
                style={{
                    background: 'var(--accent-gradient)',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                }}
            >
                {loading ? (
                    <><svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Creating account...</>
                ) : (
                    <>Create Account <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                )}
            </button>

            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border-color)]" />
                <span className="text-[var(--text-muted)] text-xs">or</span>
                <div className="flex-1 h-px bg-[var(--border-color)]" />
            </div>

            <p className="text-center text-[var(--text-muted)] text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-[var(--accent-color)] hover:underline font-semibold transition-colors">
                    Sign in →
                </Link>
            </p>
        </form>
    );
}