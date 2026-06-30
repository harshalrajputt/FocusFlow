import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FocusFlowIcon from "../assets/FocusFlowIcon.png";
import { getProfile, upsertProfile, completeOnboarding } from "../services/profileService";

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)', backdropFilter: 'blur(20px)' };
const inputStyle = {
    width: '100%', background: '#0a1628', border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 12, color: '#f1f5f9', fontSize: 14, padding: '12px 16px',
    outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
};

const STAGE_TITLES = [
    "Identify Stress Trigger",
    "Study Habits & Goals",
    "Companion Extension"
];

export default function Onboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const isEditMode = new URLSearchParams(location.search).get("edit") === "true";
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Simplified Onboarding State
    const [stressFactor, setStressFactor] = useState("Procrastination");
    const [studyHour, setStudyHour] = useState("Morning");
    const [dueSoon, setDueSoon] = useState("General Study");

    // Load existing profile if any (e.g. if they refreshed or are resuming onboarding)
    useEffect(() => {
        const fetchExistingProfile = async () => {
            try {
                const response = await getProfile();
                if (response.data?.data) {
                    const data = response.data.data;
                    if (data.customDetails?.description) {
                        setStressFactor(data.customDetails.description);
                    }
                    if (data.productivity?.mostProductiveHours) {
                        setStudyHour(data.productivity.mostProductiveHours);
                    }
                    if (data.goals?.academicGoals?.length > 0) {
                        setDueSoon(data.goals.academicGoals[0]);
                    }
                    
                    if (data.onboardingCompleted && !isEditMode) {
                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                        user.onboardingCompleted = true;
                        localStorage.setItem("user", JSON.stringify(user));
                        navigate("/dashboard");
                    }
                }
            } catch (err) {
                console.error("Failed to load user profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchExistingProfile();
    }, [navigate, isEditMode]);

    const handleDownloadExtension = () => {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        window.open(`${apiBase}/extension/download`, "_blank");
    };

    const handleNext = (e) => {
        e.preventDefault();
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        }
    };

    const handleFinish = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

        // Map simplified choices to standard DB schema models
        const basic = {
            nickname: currentUser.name || "Student",
            academicLevel: "Undergraduate",
            institutionName: "FocusFlow Academy",
            streamOrBranch: "General Studies",
            preferredLanguage: "English"
        };

        const schedule = {
            wakeUpTime: "06:00",
            sleepTime: "22:00",
            classTimings: { start: "08:00", end: "14:00" },
            coachingTimings: { start: "16:00", end: "18:00" },
            commuteDuration: 0
        };

        const productivity = {
            mostProductiveHours: studyHour,
            leastProductiveHours: studyHour === "Morning" ? "Afternoon" : "Morning",
            energyLevels: { morning: 6, afternoon: 6, evening: 6, night: 6 }
        };

        const focus = {
            preferredSessionDuration: 25,
            studyEnvironment: "Quiet Room",
            biggestDistractions: stressFactor === "Distraction" ? ["Phone Notifications", "Social Media (Instagram/TikTok)"] : [],
            breakPreference: "Short Walk"
        };

        const goals = {
            academicGoals: [dueSoon],
            skillsToLearn: [],
            studyStyle: "Pomodoro Technique"
        };

        const customDetails = {
            type: "stress_factor",
            description: stressFactor
        };

        try {
            // 1. Save standardized profile payload to backend
            await upsertProfile({ basic, schedule, productivity, focus, goals, customDetails, onboardingStep: 3 });

            // 2. Mark onboarding as complete on backend
            await completeOnboarding();

            // 3. Update localStorage user model
            currentUser.onboardingCompleted = true;
            localStorage.setItem("user", JSON.stringify(currentUser));

            // 4. Redirect user dynamically based on their primary stress trigger
            if (stressFactor === "Procrastination") {
                navigate("/tasks?initOnboarding=true");
            } else if (stressFactor === "Distraction") {
                navigate("/settings?initOnboarding=true");
            } else if (stressFactor === "Burnout") {
                navigate("/focus?initOnboarding=true");
            } else {
                navigate("/schedule?initOnboarding=true");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to complete onboarding. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#020817]">
                <svg className="animate-spin-slow w-10 h-10 text-violet-500 mb-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-slate-400 text-sm">Personalizing your experience...</p>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020817] px-4 py-8 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-blob" />

            {/* Logo and Header */}
            <div className="w-full max-w-xl text-center mb-8 z-10 animate-fade-in">
                <div className="inline-flex items-center gap-2 mb-3">
                    <img 
                        src={FocusFlowIcon} 
                        alt="FocusFlow Logo" 
                        className="w-8 h-8 object-contain rounded-lg shadow-lg"
                    />
                    <span className="text-lg font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">
                        FOCUSFLOW
                    </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                    Let's personalize your schedule
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Answer 3 quick questions to set up your baseline productivity environment.
                </p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full max-w-xl mb-6 z-10 px-1">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-violet-400 uppercase tracking-wider">
                        Step {step} of 3 — {STAGE_TITLES[step - 1]}
                    </span>
                    <span>{Math.round((step / 3) * 100)}% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a1628] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="w-full max-w-xl animate-fade-in flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-sm mb-4 z-10">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Step Card */}
            <div 
                className="w-full max-w-xl p-6 md:p-8 rounded-2xl shadow-2xl z-10 transition-all duration-300 animate-fade-in-up" 
                style={cardStyle}
            >
                {step === 1 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>🎭</span> What stresses you out about studying?
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: "Procrastination", label: "Procrastination", emoji: "⏳", desc: "I struggle to start studying or keep putting it off." },
                                { id: "Distraction", label: "Distraction", emoji: "📱", desc: "Phone notifications and social media steal my focus." },
                                { id: "Burnout", label: "Burnout", emoji: "🌋", desc: "I'm working too many hours and feel completely exhausted." },
                                { id: "Disorganization", label: "Disorganization", emoji: "🌀", desc: "I don't know what to study next or how to manage my time." }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStressFactor(item.id)}
                                    className={`flex flex-col items-start text-left p-4 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${
                                        stressFactor === item.id 
                                        ? 'bg-violet-600/10 border-violet-500/50 text-violet-300 ring-2 ring-violet-500/25' 
                                        : 'bg-[#0a1628] border-slate-800 hover:border-slate-700 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5 text-base">
                                        <span>{item.emoji}</span>
                                        <span className="font-bold text-slate-200">{item.label}</span>
                                    </div>
                                    <span className="text-[11px] leading-relaxed text-slate-400">{item.desc}</span>
                                </button>
                            ))}
                        </div>

                        {renderNavButtons()}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>🧠</span> Tell us about your study style
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">When do you study best?</label>
                                <select 
                                    style={inputStyle} 
                                    value={studyHour} 
                                    onChange={e => setStudyHour(e.target.value)}
                                >
                                    <option value="Morning">Morning (6 AM - 12 PM)</option>
                                    <option value="Afternoon">Afternoon (12 PM - 5 PM)</option>
                                    <option value="Evening">Evening (5 PM - 9 PM)</option>
                                    <option value="Night">Night (9 PM - 6 AM)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What is due soonest?</label>
                                <select 
                                    style={inputStyle} 
                                    value={dueSoon} 
                                    onChange={e => setDueSoon(e.target.value)}
                                >
                                    <option value="Exams">Upcoming Exams / Finals</option>
                                    <option value="Projects">Assignments / Term Projects</option>
                                    <option value="Homework">Daily Homework & Homework Sheets</option>
                                    <option value="General Study">General Subject Learning & Revision</option>
                                </select>
                            </div>
                        </div>

                        {renderNavButtons()}
                    </div>
                )}

                {step === 3 && (
                    <form onSubmit={handleFinish} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>🔌</span> Install Chrome Companion Extension
                        </h2>
                        
                        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-600/5 space-y-3">
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Install the helper extension to sync Pomodoro timers and automatically block distracting tabs (like Instagram & YouTube) during active study blocks.
                            </p>
                            
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadExtension}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition cursor-pointer"
                                >
                                    Download Extension 📥
                                </button>
                                <a 
                                    href="https://github.com/harshalrajputt/FocusFlow" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-[var(--bg-tertiary)] text-slate-400 text-xs font-bold text-center flex items-center justify-center transition"
                                >
                                    Setup Guide 📖
                                </a>
                            </div>
                        </div>

                        {renderNavButtons()}
                    </form>
                )}
            </div>
        </div>
    );

    function renderNavButtons() {
        return (
            <div className="flex justify-between items-center pt-4 border-t border-slate-800/40 mt-6">
                {step > 1 ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-semibold transition-colors duration-250 cursor-pointer"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back
                    </button>
                ) : (
                    <div />
                )}

                {step < 3 ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                    >
                        Next Step
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
                    >
                        {saving ? "Saving..." : "Finish & Let's Study! 🚀"}
                    </button>
                )}
            </div>
        );
    }
}
