import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { forgotPassword, resetPassword } from "../services/authService";

const inputBase = "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] outline-none transition-all duration-200";

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password with OTP
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [devOtpCode, setDevOtpCode] = useState(""); // Helper for easy development testing
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        try {
            const res = await forgotPassword({ email });
            if (res.data && res.data.success) {
                setMessage(res.data.message || "OTP code has been generated.");
                if (res.data.devOTP) {
                    setDevOtpCode(res.data.devOTP);
                }
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send reset code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");
        try {
            const res = await resetPassword({ email, otp, newPassword });
            if (res.data && res.data.success) {
                // Flash success message and navigate to login
                alert("Password reset successfully! Please sign in using your new password.");
                navigate("/login");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid or expired verification code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={step === 1 ? "Reset Password" : "Verify OTP Code"}
            subtitle="Get back into your deep work zone."
        >
            <div className="space-y-5">
                {/* Message / Error notifications */}
                {error && (
                    <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {message && (
                    <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-teal-500/25 bg-teal-500/10 px-4 py-3 text-teal-600 dark:text-teal-400 text-sm">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {message}
                    </div>
                )}

                {/* Development copy-paste helper */}
                {step === 2 && devOtpCode && (
                    <div className="animate-fade-in p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs">
                        <p className="font-bold uppercase tracking-wider mb-1">🛠️ Development SandBox OTP</p>
                        <p>We generated this code for verification: <code className="font-mono text-sm select-all bg-amber-500/10 px-1.5 py-0.5 rounded font-black">{devOtpCode}</code> (Click to select & copy)</p>
                    </div>
                )}

                {step === 1 ? (
                    /* STEP 1 FORM: Ask Email */
                    <form onSubmit={handleRequestOtp} className="space-y-5">
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            Enter the email address associated with your FocusFlow account. We'll generate a secure verification OTP to authorize your password reset.
                        </p>
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setError(""); setEmail(e.target.value); }}
                                    placeholder="you@example.com"
                                    required
                                    className={`${inputBase} pl-10 pr-4 py-3`}
                                    onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                                    onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/10 disabled:opacity-55 disabled:cursor-not-allowed mt-1 cursor-pointer"
                            style={{
                                background: 'var(--accent-gradient)',
                                boxShadow: '0 4px 20px var(--accent-glow)',
                            }}
                        >
                            {loading ? "Generating OTP..." : "Get Hashing OTP Code"}
                        </button>
                    </form>
                ) : (
                    /* STEP 2 FORM: Code & Passwords inputs */
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            Enter the 6-digit OTP code sent to your email along with your desired new secure password.
                        </p>

                        {/* OTP Verification code */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                6-Digit OTP Code
                            </label>
                            <input
                                type="text"
                                maxLength="6"
                                value={otp}
                                onChange={(e) => { setError(""); setOtp(e.target.value.replace(/\D/g, '')); }}
                                placeholder="123456"
                                required
                                className={`${inputBase} text-center tracking-widest font-mono font-bold text-lg py-3`}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            />
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => { setError(""); setNewPassword(e.target.value); }}
                                placeholder="Minimum 8 characters"
                                required
                                className={`${inputBase} px-4 py-3`}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => { setError(""); setConfirmPassword(e.target.value); }}
                                placeholder="Re-type new password"
                                required
                                className={`${inputBase} px-4 py-3`}
                                onFocus={e => { e.target.style.borderColor = 'var(--accent-color)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !otp || !newPassword || !confirmPassword}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/10 disabled:opacity-55 disabled:cursor-not-allowed mt-1 cursor-pointer"
                            style={{
                                background: 'var(--accent-gradient)',
                                boxShadow: '0 4px 20px var(--accent-glow)',
                            }}
                        >
                            {loading ? "Verifying & Hashing..." : "Confirm Hashing Change"}
                        </button>
                    </form>
                )}

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--border-color)]" />
                    <span className="text-[var(--text-muted)] text-xs">or</span>
                    <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                <p className="text-center text-sm">
                    <Link to="/login" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold transition-colors">
                        ← Back to Sign In
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
