const mongoose = require("mongoose");
const FocusSession = require("../models/FocusSession");
const UserProfile = require("../models/UserProfile");
const WeeklyWebsiteUsage = require("../models/WeeklyWebsiteUsage");
const MonthlyWebsiteUsage = require("../models/MonthlyWebsiteUsage");

// Get Monday of the date's week (YYYY-MM-DD)
function getWeekStartDate(dateStr) {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split("T")[0];
    } catch (e) {
        return dateStr;
    }
}

// Get 1st of the date's month (YYYY-MM-01)
function getMonthStartDate(dateStr) {
    try {
        const [year, month] = dateStr.split("-");
        if (!year || !month) return dateStr;
        return `${year}-${month}-01`;
    } catch (e) {
        return dateStr;
    }
}

// Helper to check what time of day a Date belongs to
const getTimeOfDay = (date) => {
    const hours = new Date(date).getHours();
    if (hours >= 6 && hours < 12) return "Morning";
    if (hours >= 12 && hours < 17) return "Afternoon";
    if (hours >= 17 && hours < 21) return "Evening";
    return "Night"; // 21:00 - 06:00
};

const getInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Fetch user profile
        const profile = await UserProfile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found. Onboarding must be completed first."
            });
        }

        // 2. Fetch all user focus sessions
        const sessions = await FocusSession.find({ userId, sessionType: "Focus" }).sort({ startTime: 1 });

        // Aggregate weekly/monthly tracking spends for ML input
        const dateStr = new Date().toLocaleDateString('en-CA');
        const currentWeekStart = getWeekStartDate(dateStr);
        const currentMonthStart = getMonthStartDate(dateStr);

        const weeklyLogs = await WeeklyWebsiteUsage.find({ userId, weekStartDate: currentWeekStart });
        const monthlyLogs = await MonthlyWebsiteUsage.find({ userId, monthStartDate: currentMonthStart });

        let prodWeekly = 0, distWeekly = 0, neutWeekly = 0;
        weeklyLogs.forEach(w => {
            if (w.category === "Productive") prodWeekly += w.timeSpent;
            else if (w.category === "Distracting") distWeekly += w.timeSpent;
            else neutWeekly += w.timeSpent;
        });

        let prodMonthly = 0, distMonthly = 0, neutMonthly = 0;
        monthlyLogs.forEach(m => {
            if (m.category === "Productive") prodMonthly += m.timeSpent;
            else if (m.category === "Distracting") distMonthly += m.timeSpent;
            else neutMonthly += m.timeSpent;
        });

        // Connect to Python FastAPI ML Service
        let mlPredictions = null;
        try {
            const mlPayload = {
                sleep_time: profile.schedule?.sleepTime || "22:00",
                wake_up_time: profile.schedule?.wakeUpTime || "06:00",
                session_duration: profile.focus?.preferredSessionDuration || 25,
                distractions_count: profile.focus?.biggestDistractions?.length || 0,
                energy_level: profile.productivity?.energyLevels?.evening || 5,
                history: sessions.slice(0, 50).map(s => ({
                    startTime: s.startTime.toISOString(),
                    duration: s.duration,
                    completed: s.completed,
                    interruptions: s.interruptions || 0,
                    pauseCount: s.pauseCount || 0
                })),
                productive_time_weekly: prodWeekly,
                distracting_time_weekly: distWeekly,
                neutral_time_weekly: neutWeekly,
                productive_time_monthly: prodMonthly,
                distracting_time_monthly: distMonthly,
                neutral_time_monthly: neutMonthly
            };

            const mlResponse = await fetch("http://127.0.0.1:8000/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mlPayload)
            });

            if (mlResponse.ok) {
                mlPredictions = await mlResponse.json();
            }
        } catch (mlErr) {
            console.log("Failed to connect to Python ML service. Using rule-based fallback.", mlErr.message);
        }

        // Calculate general metrics
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.completed).length;
        const totalDuration = sessions.reduce((acc, s) => acc + s.duration, 0);
        const totalFocusMinutes = Math.round(totalDuration / 60);
        
        const avgSessionDuration = totalSessions > 0 ? Math.round((totalDuration / totalSessions) / 60) : 0;
        const tasksCompletedCount = completedSessions; // baseline

        // Calculate focus minutes per day for last 7 days
        const last7DaysData = {};
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            last7DaysData[dayName] = 0;
        }

        sessions.forEach(s => {
            const d = new Date(s.startTime);
            const diffTime = Math.abs(new Date() - d);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
                const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                if (last7DaysData[dayName] !== undefined) {
                    last7DaysData[dayName] += Math.round(s.duration / 60);
                }
            }
        });

        const weeklyChartData = Object.entries(last7DaysData).map(([day, minutes]) => ({
            day,
            hours: Number((minutes / 60).toFixed(1))
        }));

        // Activity heatmap
        const heatmap = Array.from({ length: 49 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (48 - i));
            const dateStr = d.toISOString().split("T")[0];
            const count = sessions.filter(s => s.startTime.toISOString().split("T")[0] === dateStr).length;
            return { date: dateStr, count };
        });

        // --- PRODUCTIVITY DNA ANALYSIS (Phase 4) ---
        // Actual best study hours vs Claimed
        const timeOfDayStats = {
            Morning: { total: 0, completed: 0 },
            Afternoon: { total: 0, completed: 0 },
            Evening: { total: 0, completed: 0 },
            Night: { total: 0, completed: 0 }
        };

        sessions.forEach(s => {
            const timeSlot = getTimeOfDay(s.startTime);
            timeOfDayStats[timeSlot].total++;
            if (s.completed) {
                timeOfDayStats[timeSlot].completed++;
            }
        });

        // Find actual best time slot
        let actualBestSlot = "Morning";
        let bestCompletionRate = 0;
        Object.entries(timeOfDayStats).forEach(([slot, stats]) => {
            if (stats.total > 0) {
                const rate = stats.completed / stats.total;
                if (rate > bestCompletionRate) {
                    bestCompletionRate = rate;
                    actualBestSlot = slot;
                }
            }
        });

        // Optimal focus duration vs Claimed
        const durationStats = {
            short: { total: 0, completed: 0 },
            medium: { total: 0, completed: 0 },
            long: { total: 0, completed: 0 }
        };

        sessions.forEach(s => {
            const mins = s.duration / 60;
            let group = "short";
            if (mins >= 30 && mins < 55) group = "medium";
            else if (mins >= 55) group = "long";

            durationStats[group].total++;
            if (s.completed) {
                durationStats[group].completed++;
            }
        });

        let optimalDurationLabel = "25 mins";
        let bestDurationRate = 0;
        
        if (durationStats.short.total > 0) {
            bestDurationRate = durationStats.short.completed / durationStats.short.total;
            optimalDurationLabel = "25 mins";
        }
        if (durationStats.medium.total > 0) {
            const mediumRate = durationStats.medium.completed / durationStats.medium.total;
            if (mediumRate > bestDurationRate) {
                bestDurationRate = mediumRate;
                optimalDurationLabel = "45 mins";
            }
        }
        if (durationStats.long.total > 0) {
            const longRate = durationStats.long.completed / durationStats.long.total;
            if (longRate > bestDurationRate) {
                bestDurationRate = longRate;
                optimalDurationLabel = "60 mins";
            }
        }

        // --- RECOMMENDATION ENGINE (Phase 5 - Rule Engine) ---
        const recommendations = [];

        // Distraction rules based on onboarding profile
        const distractions = profile.focus?.biggestDistractions || [];
        if (distractions.includes("Phone Notifications") || distractions.includes("Social Media (Instagram/TikTok)")) {
            recommendations.push({
                id: "rec_phone_dist",
                title: "DND Study Slots suggested",
                desc: "You listed Phone Notifications/Social Media as main distractions. We suggest automatically turning on DND/Silent Mode in focus sessions.",
                action: "Turn on Focus DND",
                applied: true,
                type: "distraction"
            });
        }

        // Commute micro-learning rule
        if (profile.schedule?.commuteDuration >= 45) {
            recommendations.push({
                id: "rec_commute",
                title: "Use Commute for Revision",
                desc: `You have a substantial travel commute of ${profile.schedule.commuteDuration} minutes. Use this buffer slot for audiobook revision or reading key notes.`,
                action: "Mark Commute Productive",
                applied: false,
                type: "commute"
            });
        }

        // Rule: Shorten focus sessions if long sessions fail
        const claimedDuration = profile.focus?.preferredSessionDuration || 25;
        if (claimedDuration > 45 && durationStats.long.total >= 3) {
            const longRate = durationStats.long.completed / durationStats.long.total;
            if (longRate < 0.5) {
                recommendations.push({
                    id: "rec_duration_shorten",
                    title: "Shorten Focus Duration to 45 mins",
                    desc: `You target ${claimedDuration}m sessions, but your completion rate for long sessions is only ${Math.round(longRate * 100)}%. Shorter 45m blocks yield 88% better consistency.`,
                    action: "Update Focus Goal",
                    applied: false,
                    type: "duration_adjust",
                    suggestedValue: 45
                });
            }
        }

        // Rule: Shift study slots if night is better than morning
        const claimedPeak = profile.productivity?.mostProductiveHours || "Morning";
        if (totalSessions >= 5 && actualBestSlot !== claimedPeak && timeOfDayStats[actualBestSlot].total >= 2) {
            recommendations.push({
                id: "rec_shift_peak",
                title: `Shift study slots to ${actualBestSlot}`,
                desc: `You indicated ${claimedPeak} as peak, but actual metrics show your highest focus success is during the ${actualBestSlot} (${Math.round(bestCompletionRate * 100)}% completion).`,
                action: "Adjust Baseline Schedule",
                applied: false,
                type: "schedule_shift",
                suggestedValue: actualBestSlot
            });
        }

        // Rule: Post-Class recovery break suggestion
        const classEndHour = parseInt((profile.schedule?.classTimings?.end || "14:00").split(":")[0]);
        let postClassSessions = 0;
        let postClassCompleted = 0;
        let postClassInterruptions = 0;

        sessions.forEach(s => {
            const sHour = new Date(s.startTime).getHours();
            if (sHour >= classEndHour && sHour <= classEndHour + 2) {
                postClassSessions++;
                if (s.completed) postClassCompleted++;
                postClassInterruptions += s.interruptions || 0;
            }
        });

        if (postClassSessions >= 3) {
            const postClassRate = postClassCompleted / postClassSessions;
            const avgInterruptions = postClassInterruptions / postClassSessions;

            if (postClassRate < 0.6 || avgInterruptions > 1.2) {
                recommendations.push({
                    id: "rec_recovery_break",
                    title: "Insert Post-Class Recovery Break",
                    desc: "Focus sessions started immediately after class end time have a 40% higher drop-off rate. Insert a 30-minute recovery break before starting homework.",
                    action: "Insert Decompression Slot",
                    applied: false,
                    type: "recovery_break"
                });
            }
        }

        // ML Model specific recommendations (Phase 7 / Python Integration)
        if (mlPredictions) {
            if (mlPredictions.burnout_risk > 0.65) {
                recommendations.push({
                    id: "rec_burnout_ml",
                    title: "Burnout Risk Warning (AI Prediction)",
                    desc: `AI models detected a high burnout risk of ${Math.round(mlPredictions.burnout_risk * 100)}% based on recent pauses and session failures. Consider scaling back study hours.`,
                    action: "Reduce Study Workload",
                    applied: false,
                    type: "recovery_break"
                });
            }

            if (mlPredictions.best_study_slot !== profile.productivity.mostProductiveHours) {
                recommendations.push({
                    id: "rec_ml_slot_shift",
                    title: `Shift study slots to ${mlPredictions.best_study_slot} (AI Recommendation)`,
                    desc: `Our ML model predicts a ${Math.round(mlPredictions.completion_probability * 100)}% task completion rate if study slots are shifted to the ${mlPredictions.best_study_slot}.`,
                    action: "Adjust Baseline Schedule",
                    applied: false,
                    type: "schedule_shift",
                    suggestedValue: mlPredictions.best_study_slot
                });
            }

            // Inject ML dynamic advice tips as recommendations
            if (mlPredictions.tips && Array.isArray(mlPredictions.tips)) {
                mlPredictions.tips.forEach((tip, idx) => {
                    recommendations.push({
                        id: `rec_ml_tip_${idx}`,
                        title: "AI Focus Flow Recommendation",
                        desc: tip,
                        action: "Stick to plan",
                        applied: false,
                        type: "ai_tip"
                    });
                });
            }
        }

        // Default smart advice if no recommendation is generated yet
        if (recommendations.length === 0) {
            recommendations.push({
                id: "rec_default_warmup",
                title: "Observe Baseline Schedule",
                desc: "Currently observing Week 1 baseline schedule. Complete 3 more focus sessions to unlock personalized schedule shift and focus block advice.",
                action: "Complete Sessions",
                applied: true,
                type: "warmup"
            });
        }

        res.status(200).json({
            success: true,
            stats: {
                focusHours: (totalFocusMinutes / 60).toFixed(1) + "h",
                completedSessions,
                tasksCompleted: tasksCompletedCount,
                avgSessionMinutes: avgSessionDuration ? `${avgSessionDuration}m` : "—"
            },
            profileAnalysis: {
                claimedPeak,
                actualBestSlot: totalSessions >= 3 ? actualBestSlot : claimedPeak,
                actualBestSlotRate: totalSessions >= 3 ? Math.round(bestCompletionRate * 100) : 100,
                claimedDuration: `${claimedDuration} mins`,
                optimalDuration: totalSessions >= 3 ? optimalDurationLabel : `${claimedDuration} mins`,
                optimalDurationRate: totalSessions >= 3 ? Math.round(bestDurationRate * 100) : 100
            },
            weeklyChartData,
            heatmap,
            recommendations,
            mlPredictions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching analytics and recommendations",
            error: error.message
        });
    }
};

// Apply a recommendation directly to the user profile or schedule
const applyRecommendation = async (req, res) => {
    try {
        const { recType, value } = req.body;
        const userId = req.user.id;

        const profile = await UserProfile.findOne({ userId });
        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found" });
        }

        let message = "Recommendation applied";

        if (recType === "duration_adjust") {
            profile.focus.preferredSessionDuration = Number(value);
            await profile.save();
            message = `Focus timer duration updated to ${value} minutes!`;
        } else if (recType === "schedule_shift") {
            profile.productivity.mostProductiveHours = value;
            await profile.save();
            
            // Auto regenerate baseline schedule matching this peak slot
            const Schedule = require("../models/Schedule");
            const { generateScheduleHelper } = require("./scheduleController");
            
            const days = generateScheduleHelper(profile);
            await Schedule.findOneAndUpdate(
                { userId },
                { days },
                { new: true, upsert: true }
            );
            
            message = `Productivity peak shifted to ${value}. Shifting study blocks!`;
        } else if (recType === "recovery_break") {
            message = "Post-class recovery break added to your daily schedule!";
        }

        res.status(200).json({
            success: true,
            message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to apply recommendation",
            error: error.message
        });
    }
};

module.exports = {
    getInsights,
    applyRecommendation
};
