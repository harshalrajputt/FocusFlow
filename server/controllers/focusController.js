const mongoose = require("mongoose");
const FocusSession = require("../models/FocusSession");

// ─── LOG focus session ────────────────────────────────────────────────────────
const logSession = async (req, res) => {
    try {
        const {
            taskId,
            sessionType,
            duration,
            startTime,
            endTime,
            completed,
            interruptions,
            pauseCount,
            followedSchedule,
            missedTask,
            delayedTask,
            difficultyRating,
            difficultyFeedback,
        } = req.body;

        if (!sessionType || duration === undefined || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (sessionType, duration, startTime, endTime)",
            });
        }

        const isCompleted = completed !== undefined ? completed : true;

        const session = await FocusSession.create({
            userId: req.user.id,
            taskId: taskId || null,
            sessionType,
            duration,
            startTime,
            endTime,
            completed: isCompleted,
            interruptions: interruptions || 0,
            pauseCount: pauseCount || 0,
            followedSchedule: followedSchedule !== undefined ? followedSchedule : true,
            missedTask: missedTask || false,
            delayedTask: delayedTask || false,
            difficultyRating: difficultyRating || 3,
            difficultyFeedback: difficultyFeedback || "Normal",
        });

        // Trigger goal progress if session is a completed Focus session
        if (isCompleted && sessionType === "Focus") {
            const { trackGoalProgress } = require("../utils/goalTracker");
            await trackGoalProgress(req.user.id, "FocusSessions", 1);
            
            const minutesFocused = Math.round(duration / 60);
            if (minutesFocused > 0) {
                await trackGoalProgress(req.user.id, "FocusMinutes", minutesFocused);
            }
        }

        res.status(201).json({
            success: true,
            session,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while logging focus session",
            error: error.message,
        });
    }
};

// ─── GET past sessions ────────────────────────────────────────────────────────
const getSessions = async (req, res) => {
    try {
        const { startDate, endDate, limit = 50 } = req.query;
        const filter = { userId: req.user.id };

        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) filter.startTime.$gte = new Date(startDate);
            if (endDate) filter.startTime.$lte = new Date(endDate);
        }

        const sessions = await FocusSession.find(filter)
            .sort({ startTime: -1 })
            .limit(Math.min(Number(limit), 100))
            .populate("taskId", "title");

        res.status(200).json({
            success: true,
            count: sessions.length,
            sessions,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching focus sessions",
            error: error.message,
        });
    }
};

// ─── GET summary statistics ───────────────────────────────────────────────────
const getSummary = async (req, res) => {
    try {
        const userId = req.user.id;

        // Start of today (Local/UTC helper bounds)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Sessions today (type "Focus" only)
        const sessionsTodayCount = await FocusSession.countDocuments({
            userId,
            sessionType: "Focus",
            startTime: { $gte: startOfToday },
        });

        // Total focus duration (type "Focus" only)
        const totalFocusResult = await FocusSession.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), sessionType: "Focus" } },
            { $group: { _id: null, totalSeconds: { $sum: "$duration" } } }
        ]);
        const totalFocusSeconds = totalFocusResult.length > 0 ? totalFocusResult[0].totalSeconds : 0;
        const totalFocusMinutes = Math.round(totalFocusSeconds / 60);

        // Today's focus duration (type "Focus" only)
        const todayFocusResult = await FocusSession.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), sessionType: "Focus", startTime: { $gte: startOfToday } } },
            { $group: { _id: null, totalSeconds: { $sum: "$duration" } } }
        ]);
        const todayFocusSeconds = todayFocusResult.length > 0 ? todayFocusResult[0].totalSeconds : 0;
        const todayFocusMinutes = Math.round(todayFocusSeconds / 60);

        // Calculate streaks (consecutive days with at least one "Focus" session)
        const focusSessions = await FocusSession.find({
            userId,
            sessionType: "Focus",
        }).select("startTime").sort({ startTime: 1 });

        let currentStreak = 0;
        let bestStreak = 0;

        if (focusSessions.length > 0) {
            // Get sorted array of unique dates formatted as YYYY-MM-DD
            const dateStrings = [...new Set(focusSessions.map(s => {
                const d = new Date(s.startTime);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }))];

            if (dateStrings.length > 0) {
                let tempStreak = 1;
                bestStreak = 1;

                for (let i = 1; i < dateStrings.length; i++) {
                    const prevDate = new Date(dateStrings[i - 1]);
                    const currDate = new Date(dateStrings[i]);
                    const diffTime = Math.abs(currDate - prevDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        tempStreak++;
                    } else if (diffDays > 1) {
                        if (tempStreak > bestStreak) {
                            bestStreak = tempStreak;
                        }
                        tempStreak = 1;
                    }
                }
                if (tempStreak > bestStreak) {
                    bestStreak = tempStreak;
                }

                // Check if current streak is still active
                const lastSessionDate = new Date(dateStrings[dateStrings.length - 1]);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                lastSessionDate.setHours(0, 0, 0, 0);

                const diffSinceLast = Math.ceil(Math.abs(today - lastSessionDate) / (1000 * 60 * 60 * 24));
                if (diffSinceLast <= 1) {
                    currentStreak = tempStreak;
                } else {
                    currentStreak = 0;
                }
            }
        }

        res.status(200).json({
            success: true,
            sessionsToday: sessionsTodayCount,
            totalFocusMinutes,
            todayFocusMinutes,
            currentStreak,
            bestStreak,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while computing focus summary",
            error: error.message,
        });
    }
};

module.exports = {
    logSession,
    getSessions,
    getSummary,
};
