import { useState, useEffect } from "react";
import { getInsights, applyRecommendation } from "../services/analyticsService";

const cardStyle = { background: '#0d1526', border: '1px solid rgba(148,163,184,0.07)' };

const StatCard = ({ label, value, sub, icon, color, glow }) => (
    <div
        className="rounded-2xl p-5 relative overflow-hidden transition-all duration-300"
        style={cardStyle}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${glow}`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${glow}, transparent 70%)` }} />
        <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '22' }}>{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-100">{value}</p>
            {sub && <p className="text-slate-700 text-xs mt-1">{sub}</p>}
        </div>
    </div>
);

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [insights, setInsights] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    const fetchInsights = async () => {
        try {
            setError("");
            const res = await getInsights();
            if (res.data?.success) {
                setInsights(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const handleApplyRecommendation = async (recId, recType, value) => {
        try {
            setError("");
            setSuccessMessage("");
            const res = await applyRecommendation(recType, value);
            if (res.data?.success) {
                setSuccessMessage(res.data.message || "Recommendation applied!");
                setTimeout(() => setSuccessMessage(""), 5000);
                fetchInsights();
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to apply recommendation.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <svg className="animate-spin-slow w-8 h-8 text-violet-500 mb-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-slate-500 text-sm">Compiling productivity metrics...</p>
            </div>
        );
    }

    const stats = insights?.stats || { focusHours: "0h", completedSessions: 0, tasksCompleted: 0, avgSessionMinutes: "—" };
    const analysis = insights?.profileAnalysis || {
        claimedPeak: "Morning",
        actualBestSlot: "Morning",
        actualBestSlotRate: 100,
        claimedDuration: "25 mins",
        optimalDuration: "25 mins",
        optimalDurationRate: 100
    };
    const chartData = insights?.weeklyChartData || [];
    const heatmap = insights?.heatmap || [];
    const recommendations = insights?.recommendations || [];

    const maxHoursInChart = Math.max(...chartData.map(c => c.hours), 1);
    const maxBarHeight = 100; // px

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">Productivity Profile & Analytics</h1>
                    <p className="text-slate-600 text-sm mt-1">AI-driven scheduling audit and behavioral analysis</p>
                </div>
                <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 text-sm self-start sm:self-auto"
                    style={cardStyle}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Baseline Audit
                </div>
            </div>

            {/* Alert Logs */}
            {error && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-1">
                <StatCard label="Focus Time" value={stats.focusHours} sub="This week" color="#7c3aed" glow="rgba(124,58,237,0.06)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <StatCard label="Sessions" value={String(stats.completedSessions)} sub="Completed" color="#4f46e5" glow="rgba(79,70,229,0.06)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                />
                <StatCard label="Tasks Done" value={String(stats.tasksCompleted)} sub="This week" color="#10b981" glow="rgba(16,185,129,0.06)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                />
                <StatCard label="Avg. Session" value={stats.avgSessionMinutes} sub="Minutes" color="#f59e0b" glow="rgba(245,158,11,0.06)"
                    icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                />
            </div>

            {/* Phase 7 Predictive AI Panel */}
            {insights?.mlPredictions && (
                <div className="rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up delay-1" style={cardStyle}>
                    <div className="col-span-2 md:col-span-4 border-b border-slate-800/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>🔮</span> Predictive AI Engine (Real-time ML Model)
                        </h2>
                        <span className="self-start sm:self-auto text-[9px] text-violet-400 font-bold uppercase tracking-widest bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
                            Active Model: Random Forest
                        </span>
                    </div>

                    {/* Completion Probability */}
                    <div className="bg-[#0a1628]/60 p-4 rounded-xl border border-slate-800/40 text-center flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Completion Prob.</p>
                        <p className="text-3xl font-extrabold text-violet-400">
                            {Math.round(insights.mlPredictions.completion_probability * 100)}%
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1.5">Expected focus success rate</p>
                    </div>

                    {/* Burnout Risk */}
                    <div className="bg-[#0a1628]/60 p-4 rounded-xl border border-slate-800/40 flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Burnout Risk</p>
                        <p className="text-3xl font-extrabold text-slate-200">
                            {Math.round(insights.mlPredictions.burnout_risk * 100)}%
                        </p>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                    width: `${insights.mlPredictions.burnout_risk * 100}%`,
                                    background: insights.mlPredictions.burnout_risk > 0.65 ? '#ef4444' : insights.mlPredictions.burnout_risk > 0.4 ? '#f59e0b' : '#10b981'
                                }}
                            />
                        </div>
                    </div>

                    {/* Best Time Slot */}
                    <div className="bg-[#0a1628]/60 p-4 rounded-xl border border-slate-800/40 text-center flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">AI Best Study hour</p>
                        <p className="text-2xl font-extrabold text-emerald-400">
                            {insights.mlPredictions.best_study_slot}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-2">Predicted peak focus window</p>
                    </div>

                    {/* Confidence score */}
                    <div className="bg-[#0a1628]/60 p-4 rounded-xl border border-slate-800/40 text-center flex flex-col justify-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Model Confidence</p>
                        <p className="text-3xl font-extrabold text-amber-400">
                            {Math.round(insights.mlPredictions.confidence_score * 100)}%
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1.5">
                            {insights.mlPredictions.confidence_score > 0.8 ? "Model trained on history" : "Cold-start synthetic model"}
                        </p>
                    </div>
                </div>
            )}

            {/* Weekly focus hours visualizer */}
            <div className="rounded-2xl p-6 animate-fade-in-up delay-2" style={cardStyle}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider">Weekly Focus Volume</h2>
                        <p className="text-slate-500 text-[10px] mt-0.5">Distribution of focus hours across the last 7 calendar days</p>
                    </div>
                    <span
                        className="text-xs px-3 py-1 rounded-full font-semibold"
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
                    >
                        Focus Distribution
                    </span>
                </div>

                <div className="flex items-end gap-3" style={{ height: maxBarHeight + 32 }}>
                    {chartData.map((c) => {
                        const barHeight = Math.max(Math.round((c.hours / maxHoursInChart) * maxBarHeight), 4);
                        const hasHours = c.hours > 0;
                        
                        return (
                            <div key={c.day} className="flex flex-col items-center gap-2 flex-1 group relative">
                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-[105%] bg-slate-900 border border-slate-800 text-slate-100 text-[10px] px-2 py-1 rounded transition-opacity duration-200 pointer-events-none whitespace-nowrap z-25">
                                    {c.hours} hrs focused
                                </div>
                                <div className="w-full flex items-end justify-center" style={{ height: maxBarHeight }}>
                                    <div
                                        className="w-full max-w-[40px] rounded-t-lg transition-all duration-300 relative overflow-hidden"
                                        style={{ 
                                            height: barHeight, 
                                            background: hasHours 
                                                ? 'linear-gradient(180deg, #7c3aed 0%, #4f46e5 100%)' 
                                                : 'rgba(148,163,184,0.06)',
                                            boxShadow: hasHours ? '0 0 10px rgba(124,58,237,0.25)' : 'none'
                                        }}
                                    />
                                </div>
                                <span className="text-slate-500 text-xs font-medium">{c.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Productivity Profile Comparison */}
            <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up delay-2">
                
                {/* Time of Day Comparison */}
                <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
                        <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>🌅</span> Productivity Hours Audit
                        </h2>
                        {analysis.claimedPeak === analysis.actualBestSlot ? (
                            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest">
                                Claim Verified
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-widest">
                                Audited Mismatch
                            </span>
                        )}
                    </div>

                    <div className="space-y-4 py-2">
                        <div className="flex justify-between items-center bg-[#0a1628]/60 p-3.5 rounded-xl border border-slate-800/40">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">What you claimed</p>
                                <p className="text-sm font-bold text-slate-300 mt-1">{analysis.claimedPeak} Slot</p>
                            </div>
                            <span className="text-2xl">⏳</span>
                        </div>

                        <div className="flex justify-between items-center bg-violet-600/10 p-3.5 rounded-xl border border-violet-500/20">
                            <div>
                                <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">What data says</p>
                                <p className="text-sm font-bold text-slate-200 mt-1">{analysis.actualBestSlot} Peak</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-violet-400 font-semibold">{analysis.actualBestSlotRate}%</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">Success Rate</p>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Claimed peak hours are collected during onboarding. actual data is computed dynamically by matching completed sessions against start timestamps.
                    </p>
                </div>

                {/* Focus Duration Comparison */}
                <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
                    <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
                        <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>⏱️</span> Optimal Session Audit
                        </h2>
                        {analysis.claimedDuration === analysis.optimalDuration ? (
                            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest">
                                Claim Verified
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-widest">
                                Audited Mismatch
                            </span>
                        )}
                    </div>

                    <div className="space-y-4 py-2">
                        <div className="flex justify-between items-center bg-[#0a1628]/60 p-3.5 rounded-xl border border-slate-800/40">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">What you claimed</p>
                                <p className="text-sm font-bold text-slate-300 mt-1">{analysis.claimedDuration}</p>
                            </div>
                            <span className="text-2xl">⏳</span>
                        </div>

                        <div className="flex justify-between items-center bg-violet-600/10 p-3.5 rounded-xl border border-violet-500/20">
                            <div>
                                <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">What data says</p>
                                <p className="text-sm font-bold text-slate-200 mt-1">{analysis.optimalDuration} target</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-violet-400 font-semibold">{analysis.optimalDurationRate}%</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">Success Rate</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        Longer sessions often suffer from fatigue-induced interruptions. FocusFlow audits actual focus minutes to highlight your optimal baseline study cycle.
                    </p>
                </div>

            </div>

            {/* Density & Coach Row */}
            <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up delay-3">
                
                {/* Heatmap */}
                <div className="rounded-2xl p-5 md:col-span-1 space-y-4" style={cardStyle}>
                    <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider">Activity Density</h2>
                    <p className="text-slate-500 text-[10px] mt-0.5">Tracking sessions count over the past 49 calendar days</p>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {heatmap.map((cell, i) => {
                            let bg = "rgba(148, 163, 184, 0.05)";
                            let border = "transparent";
                            
                            if (cell.count === 1) bg = "rgba(124, 58, 237, 0.2)";
                            else if (cell.count === 2) bg = "rgba(124, 58, 237, 0.45)";
                            else if (cell.count >= 3) {
                                bg = "rgba(124, 58, 237, 0.8)";
                                border = "rgba(167, 139, 250, 0.35)";
                            }
                            
                            return (
                                <div
                                    key={i}
                                    className="aspect-square rounded-sm transition-all duration-200 relative group"
                                    style={{ background: bg, border: `1px solid ${border}` }}
                                >
                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-[125%] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[9px] text-slate-200 px-1.5 py-0.5 rounded transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                                        {cell.date}: {cell.count} session{cell.count !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/40">
                        <span>Less active</span>
                        <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded bg-slate-800" />
                            <div className="w-2.5 h-2.5 rounded bg-violet-600/20" />
                            <div className="w-2.5 h-2.5 rounded bg-violet-600/50" />
                            <div className="w-2.5 h-2.5 rounded bg-violet-600" />
                        </div>
                        <span>More active</span>
                    </div>
                </div>

                {/* AI Coach Cards */}
                <div className="rounded-2xl p-5 md:col-span-2 space-y-4" style={cardStyle}>
                    <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>🤖</span> AI Productivity Coach (Rule Engine)
                    </h2>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                        Active suggestions based on audited behavioral data and onboarding profile distractions
                    </p>

                    <div className="space-y-3">
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className="p-4 rounded-xl border border-slate-800 bg-[#0a1628]/40 hover:bg-[#0a1628]/70 transition-all duration-250 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-200">{rec.title}</h3>
                                        <span className="px-1.5 py-0.5 rounded bg-violet-600/10 text-violet-400 border border-violet-500/20 text-[9px] font-semibold tracking-wider">
                                            {rec.id.includes("ml") ? "AI Model Suggestion" : "Rule Triggered"}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-xs leading-relaxed max-w-xl">{rec.desc}</p>
                                </div>

                                {rec.applied ? (
                                    <span className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold whitespace-nowrap">
                                        ✓ Applied
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleApplyRecommendation(rec.id, rec.type, rec.suggestedValue)}
                                        className="self-start sm:self-center px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 whitespace-nowrap cursor-pointer hover:shadow-lg hover:shadow-violet-500/15"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                                    >
                                        Apply Suggestion
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}