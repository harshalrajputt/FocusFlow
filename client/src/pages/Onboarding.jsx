import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, upsertProfile, completeOnboarding } from "../services/profileService";

// Styled Components / Constants matching settings.jsx
const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)', backdropFilter: 'blur(20px)' };
const inputStyle = {
    width: '100%', background: '#0a1628', border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 12, color: '#f1f5f9', fontSize: 14, padding: '12px 16px',
    outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
};

const STAGE_TITLES = [
    "Academic Profile",
    "Daily Schedule",
    "Productivity DNA",
    "Study Preferences",
    "Goals & Study Style"
];

// Helper: Tags Input component for Step 5
const TagsInput = ({ tags, setTags, placeholder }) => {
    const [input, setInput] = useState("");
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.trim();
            if (val && !tags.includes(val)) {
                setTags([...tags, val]);
                setInput("");
            }
        }
    };
    const removeTag = (indexToRemove) => {
        setTags(tags.filter((_, i) => i !== indexToRemove));
    };
    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-2 p-2.5 bg-[#0a1628] border border-slate-800 rounded-xl min-h-[50px] items-center transition-colors focus-within:border-violet-500/50">
                {tags.map((tag, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium rounded-full">
                        <span>{tag}</span>
                        <button type="button" onClick={() => removeTag(i)} className="text-violet-400 hover:text-violet-200 focus:outline-none text-sm leading-none">&times;</button>
                    </div>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : "Press Enter to add"}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-slate-100 text-sm py-1 placeholder-slate-600"
                />
            </div>
        </div>
    );
};

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Form states matching backend UserProfile model
    const [basic, setBasic] = useState({
        nickname: "",
        academicLevel: "Undergraduate",
        institutionName: "",
        streamOrBranch: "",
        preferredLanguage: "English"
    });

    const [schedule, setSchedule] = useState({
        wakeUpTime: "06:00",
        sleepTime: "22:00",
        classTimings: { start: "08:00", end: "14:00" },
        coachingTimings: { start: "16:00", end: "18:00" },
        commuteDuration: 30
    });

    const [productivity, setProductivity] = useState({
        mostProductiveHours: "Morning",
        leastProductiveHours: "Afternoon",
        energyLevels: { morning: 8, afternoon: 5, evening: 7, night: 6 }
    });

    const [focus, setFocus] = useState({
        preferredSessionDuration: 25,
        studyEnvironment: "Quiet Room",
        biggestDistractions: [],
        breakPreference: "Short Walk"
    });

    const [goals, setGoals] = useState({
        academicGoals: [],
        skillsToLearn: [],
        studyStyle: "Pomodoro Technique"
    });

    // Load existing profile if any (e.g. if they refreshed or are resuming onboarding)
    useEffect(() => {
        const fetchExistingProfile = async () => {
            try {
                const response = await getProfile();
                if (response.data?.data) {
                    const data = response.data.data;
                    if (data.basic) setBasic(prev => ({ ...prev, ...data.basic }));
                    if (data.schedule) setSchedule(prev => ({ ...prev, ...data.schedule }));
                    if (data.productivity) setProductivity(prev => ({ ...prev, ...data.productivity }));
                    if (data.focus) setFocus(prev => ({ ...prev, ...data.focus }));
                    if (data.goals) setGoals(prev => ({ ...prev, ...data.goals }));
                    if (data.onboardingStep) setStep(data.onboardingStep);
                    if (data.onboardingCompleted) {
                        // User has already completed onboarding, redirect to dashboard
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
    }, [navigate]);

    // Handle standard inputs
    const handleBasicChange = (field, value) => {
        setBasic(prev => ({ ...prev, [field]: value }));
    };

    const handleScheduleChange = (field, value, subfield = null) => {
        if (subfield) {
            setSchedule(prev => ({
                ...prev,
                [field]: { ...prev[field], [subfield]: value }
            }));
        } else {
            setSchedule(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleProductivityChange = (field, value, subfield = null) => {
        if (subfield) {
            setProductivity(prev => ({
                ...prev,
                [field]: { ...prev[field], [subfield]: parseInt(value) }
            }));
        } else {
            setProductivity(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleFocusChange = (field, value) => {
        setFocus(prev => ({ ...prev, [field]: value }));
    };

    const toggleDistraction = (distraction) => {
        const current = [...focus.biggestDistractions];
        if (current.includes(distraction)) {
            setFocus(prev => ({
                ...prev,
                biggestDistractions: current.filter(d => d !== distraction)
            }));
        } else {
            setFocus(prev => ({
                ...prev,
                biggestDistractions: [...current, distraction]
            }));
        }
    };

    const handleGoalsChange = (field, value) => {
        setGoals(prev => ({ ...prev, [field]: value }));
    };

    // Save current step data and proceed to next step
    const handleNext = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        let payload = {};
        if (step === 1) payload = { basic };
        else if (step === 2) payload = { schedule };
        else if (step === 3) payload = { productivity };
        else if (step === 4) payload = { focus };
        else if (step === 5) payload = { goals };

        payload.onboardingStep = step + 1;

        try {
            await upsertProfile(payload);
            setStep(prev => prev + 1);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save progress. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Go back a step
    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        }
    };

    // Complete the onboarding flow
    const handleFinish = async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            // Upsert the last step's goals data
            await upsertProfile({ goals, onboardingStep: 5 });
            
            // Complete onboarding backend call
            await completeOnboarding();

            // Update user onboarding completed flag in localStorage
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            user.onboardingCompleted = true;
            localStorage.setItem("user", JSON.stringify(user));

            navigate("/dashboard");
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

    const currentUserName = JSON.parse(localStorage.getItem("user") || "{}").name || "Friend";

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020817] px-4 py-8 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-blob" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-blob delay-3" />

            {/* Logo and Header */}
            <div className="w-full max-w-xl text-center mb-8 z-10 animate-fade-in">
                <div className="inline-flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="text-white w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <span className="text-lg font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">
                        FOCUSFLOW
                    </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
                    Let's personalize your schedule
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Helping you design the perfect daily workflow based on your unique student habits
                </p>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full max-w-xl mb-6 z-10 px-1">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-violet-400 uppercase tracking-wider">
                        Step {step} of 5 — {STAGE_TITLES[step - 1]}
                    </span>
                    <span>{Math.round((step / 5) * 100)}% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-[#0a1628] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(step / 5) * 100}%` }}
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
                    <form onSubmit={handleNext} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>🎓</span> Tell us about yourself
                        </h2>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nickname / How should we call you?</label>
                            <input 
                                type="text" 
                                style={inputStyle} 
                                value={basic.nickname} 
                                onChange={e => handleBasicChange("nickname", e.target.value)} 
                                placeholder={currentUserName}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Where are you in your studies?</label>
                            <select 
                                style={inputStyle} 
                                value={basic.academicLevel} 
                                onChange={e => handleBasicChange("academicLevel", e.target.value)}
                            >
                                <option value="5th Standard">5th Standard</option>
                                <option value="6th Standard">6th Standard</option>
                                <option value="7th Standard">7th Standard</option>
                                <option value="8th Standard">8th Standard</option>
                                <option value="9th Standard">9th Standard</option>
                                <option value="10th Standard">10th Standard</option>
                                <option value="11th Standard">11th Standard</option>
                                <option value="12th Standard">12th Standard</option>
                                <option value="Undergraduate">Undergraduate (College / University)</option>
                                <option value="Postgraduate">Postgraduate (Masters / PhD)</option>
                                <option value="Other">Other / Self Study</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">School / College / University Name</label>
                            <input 
                                type="text" 
                                style={inputStyle} 
                                value={basic.institutionName} 
                                onChange={e => handleBasicChange("institutionName", e.target.value)} 
                                placeholder="e.g. Stanford University"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Stream / Major / Subject</label>
                            <input 
                                type="text" 
                                style={inputStyle} 
                                value={basic.streamOrBranch} 
                                onChange={e => handleBasicChange("streamOrBranch", e.target.value)} 
                                placeholder="e.g. Science, Commerce, Computer Science"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferred Study/Interface Language</label>
                            <select 
                                style={inputStyle} 
                                value={basic.preferredLanguage} 
                                onChange={e => handleBasicChange("preferredLanguage", e.target.value)}
                            >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                                <option value="German">German</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {renderNavButtons()}
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleNext} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>📅</span> What's your daily schedule?
                        </h2>
                        <p className="text-xs text-slate-400">
                            We use this to build optimal study slots that do not clash with classes or sleep!
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Wake-up Time</label>
                                <input 
                                    type="time" 
                                    style={inputStyle} 
                                    value={schedule.wakeUpTime} 
                                    onChange={e => handleScheduleChange("wakeUpTime", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sleep Time</label>
                                <input 
                                    type="time" 
                                    style={inputStyle} 
                                    value={schedule.sleepTime} 
                                    onChange={e => handleScheduleChange("sleepTime", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="border border-slate-800/60 p-4 rounded-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Class/School/University Timings</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Starts at</label>
                                    <input 
                                        type="time" 
                                        style={inputStyle} 
                                        value={schedule.classTimings.start} 
                                        onChange={e => handleScheduleChange("classTimings", e.target.value, "start")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ends at</label>
                                    <input 
                                        type="time" 
                                        style={inputStyle} 
                                        value={schedule.classTimings.end} 
                                        onChange={e => handleScheduleChange("classTimings", e.target.value, "end")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-800/60 p-4 rounded-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Coaching / Tuition / Extra Class timings</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Starts at</label>
                                    <input 
                                        type="time" 
                                        style={inputStyle} 
                                        value={schedule.coachingTimings.start} 
                                        onChange={e => handleScheduleChange("coachingTimings", e.target.value, "start")}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Ends at</label>
                                    <input 
                                        type="time" 
                                        style={inputStyle} 
                                        value={schedule.coachingTimings.end} 
                                        onChange={e => handleScheduleChange("coachingTimings", e.target.value, "end")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Travel / Commute Duration</label>
                                <span className="text-violet-400 text-xs font-semibold">{schedule.commuteDuration} minutes</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="180" 
                                step="5"
                                className="w-full h-1 bg-[#0a1628] accent-violet-500 rounded-lg cursor-pointer"
                                value={schedule.commuteDuration} 
                                onChange={e => handleScheduleChange("commuteDuration", parseInt(e.target.value))}
                            />
                        </div>

                        {renderNavButtons()}
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleNext} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>⚡</span> Discover your Productivity DNA
                        </h2>
                        <p className="text-xs text-slate-400">
                            When do you feel most active? This allows us to place complex study sessions in peak slots.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Most Productive Time</label>
                                <select 
                                    style={inputStyle} 
                                    value={productivity.mostProductiveHours} 
                                    onChange={e => handleProductivityChange("mostProductiveHours", e.target.value)}
                                >
                                    <option value="Morning">Morning (6 AM - 12 PM)</option>
                                    <option value="Afternoon">Afternoon (12 PM - 5 PM)</option>
                                    <option value="Evening">Evening (5 PM - 9 PM)</option>
                                    <option value="Night">Night (9 PM - 6 AM)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Least Productive Time</label>
                                <select 
                                    style={inputStyle} 
                                    value={productivity.leastProductiveHours} 
                                    onChange={e => handleProductivityChange("leastProductiveHours", e.target.value)}
                                >
                                    <option value="Morning">Morning (6 AM - 12 PM)</option>
                                    <option value="Afternoon">Afternoon (12 PM - 5 PM)</option>
                                    <option value="Evening">Evening (5 PM - 9 PM)</option>
                                    <option value="Night">Night (9 PM - 6 AM)</option>
                                </select>
                            </div>
                        </div>

                        <div className="border border-slate-800/60 p-4 rounded-xl space-y-4">
                            <h3 className="text-sm font-semibold text-slate-300">Rate your general energy levels (1 - 10)</h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-400">🌅 Morning Energy Level</span>
                                        <span className="text-xs text-violet-400 font-semibold">{productivity.energyLevels.morning}/10</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="10" 
                                        className="w-full h-1 bg-[#0a1628] accent-violet-500 rounded-lg cursor-pointer"
                                        value={productivity.energyLevels.morning}
                                        onChange={e => handleProductivityChange("energyLevels", e.target.value, "morning")}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-400">☀️ Afternoon Energy Level</span>
                                        <span className="text-xs text-violet-400 font-semibold">{productivity.energyLevels.afternoon}/10</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="10" 
                                        className="w-full h-1 bg-[#0a1628] accent-violet-500 rounded-lg cursor-pointer"
                                        value={productivity.energyLevels.afternoon}
                                        onChange={e => handleProductivityChange("energyLevels", e.target.value, "afternoon")}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-400">🌆 Evening Energy Level</span>
                                        <span className="text-xs text-violet-400 font-semibold">{productivity.energyLevels.evening}/10</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="10" 
                                        className="w-full h-1 bg-[#0a1628] accent-violet-500 rounded-lg cursor-pointer"
                                        value={productivity.energyLevels.evening}
                                        onChange={e => handleProductivityChange("energyLevels", e.target.value, "evening")}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-400">🌌 Night Energy Level</span>
                                        <span className="text-xs text-violet-400 font-semibold">{productivity.energyLevels.night}/10</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="10" 
                                        className="w-full h-1 bg-[#0a1628] accent-violet-500 rounded-lg cursor-pointer"
                                        value={productivity.energyLevels.night}
                                        onChange={e => handleProductivityChange("energyLevels", e.target.value, "night")}
                                    />
                                </div>
                            </div>
                        </div>

                        {renderNavButtons()}
                    </form>
                )}

                {step === 4 && (
                    <form onSubmit={handleNext} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>⏱️</span> Study & Focus Preferences
                        </h2>
                        <p className="text-xs text-slate-400">
                            Configure your Pomodoro session guidelines and work setup.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferred Study Session Duration</label>
                            <select 
                                style={inputStyle} 
                                value={focus.preferredSessionDuration} 
                                onChange={e => handleFocusChange("preferredSessionDuration", parseInt(e.target.value))}
                            >
                                <option value={25}>25 Minutes (Standard Pomodoro)</option>
                                <option value={45}>45 Minutes (High School Period)</option>
                                <option value={50}>50 Minutes (Advanced Focus)</option>
                                <option value={60}>60 Minutes (Deep Work)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Study Environment</label>
                            <select 
                                style={inputStyle} 
                                value={focus.studyEnvironment} 
                                onChange={e => handleFocusChange("studyEnvironment", e.target.value)}
                            >
                                <option value="Quiet Room">Quiet Bedroom / Home Study Room</option>
                                <option value="Library">Library</option>
                                <option value="Cafe">Cafes / Public Workspaces</option>
                                <option value="Group Study">Group Study / Shared Room</option>
                                <option value="Nature">Outdoors / Parks / Nature</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Break Preferences (What keeps you refreshed?)</label>
                            <select 
                                style={inputStyle} 
                                value={focus.breakPreference} 
                                onChange={e => handleFocusChange("breakPreference", e.target.value)}
                            >
                                <option value="Short Walk">Short Walk / Stretching</option>
                                <option value="Listening to Music">Listening to Music</option>
                                <option value="Snack/Drink">Grabbing a Snack or Water</option>
                                <option value="Mindfulness">Deep Breathing / Meditation</option>
                                <option value="Screen Time">Social Media / Quick Videos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Biggest Distractions (Select all that apply)</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {[
                                    "Phone Notifications",
                                    "Social Media (Instagram/TikTok)",
                                    "Online Gaming",
                                    "YouTube / Streaming / Netflix",
                                    "Family Noise / Friends",
                                    "Daydreaming / Loss of Focus",
                                    "Sleepiness / Fatigue"
                                ].map((d, i) => {
                                    const checked = focus.biggestDistractions.includes(d);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => toggleDistraction(d)}
                                            className={`flex items-center justify-between text-left p-3 rounded-xl border text-xs font-medium transition-all duration-200 ${
                                                checked 
                                                ? 'bg-violet-600/10 border-violet-500/50 text-violet-300' 
                                                : 'bg-[#0a1628] border-slate-800 hover:border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            <span>{d}</span>
                                            {checked && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><polyline points="20 6 9 17 4 12"/></svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {renderNavButtons()}
                    </form>
                )}

                {step === 5 && (
                    <form onSubmit={handleFinish} className="space-y-5">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>🎯</span> Goals & Study Style
                        </h2>
                        <p className="text-xs text-slate-400">
                            Almost done! Share your study goals so we can track and award achievements.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Academic / Study Goals</label>
                            <p className="text-[10px] text-slate-500 mb-2">What do you want to achieve? (e.g. Ace board exams, Code every day, Score 9+ GPA)</p>
                            <TagsInput 
                                tags={goals.academicGoals} 
                                setTags={(tags) => handleGoalsChange("academicGoals", tags)} 
                                placeholder="Type a goal and press Enter..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Skills you want to learn</label>
                            <p className="text-[10px] text-slate-500 mb-2">What skills are you actively developing? (e.g. JavaScript, Public Speaking, Typing)</p>
                            <TagsInput 
                                tags={goals.skillsToLearn} 
                                setTags={(tags) => handleGoalsChange("skillsToLearn", tags)} 
                                placeholder="Type a skill and press Enter..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferred Study Technique / Style</label>
                            <select 
                                style={inputStyle} 
                                value={goals.studyStyle} 
                                onChange={e => handleGoalsChange("studyStyle", e.target.value)}
                            >
                                <option value="Pomodoro Technique">Pomodoro Technique (Intervals of study & rest)</option>
                                <option value="Spaced Repetition">Spaced Repetition (Reviewing topics over expanding periods)</option>
                                <option value="Active Recall">Active Recall (Testing yourself instead of re-reading)</option>
                                <option value="Feynman Technique">Feynman Technique (Explaining topics in simple terms)</option>
                                <option value="Mind Mapping">Mind Mapping (Connecting topics visually)</option>
                            </select>
                        </div>

                        {renderNavButtons()}
                    </form>
                )}
            </div>
        </div>
    );

    // Dynamic rendering of navigation buttons
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
                    <div /> // spacing placeholder
                )}

                {step < 5 ? (
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                        onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)'; }}
                    >
                        {saving ? (
                            <><svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving...</>
                        ) : (
                            <>
                                Next Step
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
                        onMouseEnter={e => { if (!saving) e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.3)'; }}
                    >
                        {saving ? (
                            <><svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Launching...</>
                        ) : (
                            <>
                                Finish & Launch On Focus
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </>
                        )}
                    </button>
                )}
            </div>
        );
    }
}
