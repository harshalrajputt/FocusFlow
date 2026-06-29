const mongoose = require("mongoose");
const FocusSession = require("../models/FocusSession");
const User = require("../models/User");
const Pod = require("../models/Pod");
const PodActivity = require("../models/PodActivity");
const PodRivalry = require("../models/PodRivalry");
const Notification = require("../models/Notification");
const Task = require("../models/Task");
const { emitToPod, emitToUser } = require("../socket/socketHandler");

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

            // --- SOCIAL PODS GAMIFICATION HOOK ---
            try {
                // Determine XP to award today, capped at 100 XP per calendar day
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);

                const completedTodayCount = await FocusSession.countDocuments({
                    userId: req.user.id,
                    sessionType: "Focus",
                    completed: true,
                    startTime: { $gte: startOfToday }
                });

                // Award 10 XP if user hasn't completed more than 10 sessions today
                let xpEarned = 0;
                if (completedTodayCount <= 10) {
                    xpEarned = 10;
                }

                // Update User's profile XP & Streaks
                const user = await User.findById(req.user.id);
                if (user) {
                    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
                    if (user.lastActiveDate !== todayStr) {
                        const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA");
                        if (user.lastActiveDate === yesterdayStr) {
                            user.streak += 1;
                        } else {
                            user.streak = 1;
                        }
                        user.lastActiveDate = todayStr;
                    }
                    user.xp = (user.xp || 0) + xpEarned;
                    await user.save();
                }

                // Process updates for all Pods this user belongs to
                if (user) {
                    const userPods = await Pod.find({ "members.userId": req.user.id });
                    for (const pod of userPods) {
                        // 1. Update challenges
                        if (xpEarned > 0) {
                            pod.challenges.forEach(challenge => {
                                if (challenge.status === "active") {
                                    const currentContrib = challenge.progress.get(req.user.id) || 0;
                                    challenge.progress.set(req.user.id, currentContrib + xpEarned);

                                    // Sum up total XP contributed to challenge
                                    let totalContributed = 0;
                                    challenge.progress.forEach((val) => {
                                        totalContributed += val;
                                    });

                                    if (totalContributed >= challenge.targetXP) {
                                        challenge.status = "completed";
                                        const endAct = new PodActivity({
                                            podId: pod._id,
                                            userId: req.user.id,
                                            type: "challenge",
                                            message: `The group challenge "${challenge.title}" has been COMPLETED! 🎉`
                                        });
                                        endAct.save().catch(err => console.error("Error saving challenge complete log:", err));
                                    }
                                }
                            });
                        }

                        // 2. Replenish Pod Health
                        const REPLENISH = 20;
                        pod.healthScore = Math.min(100, (pod.healthScore ?? 100) + REPLENISH);

                        // 3. Check and update Pod Streak
                        const todayStr = new Date().toLocaleDateString("en-CA");
                        if (pod.lastActiveDate !== todayStr) {
                            const memberIds = pod.members.map(m => m.userId).filter(Boolean);
                            const activeMembersToday = await FocusSession.distinct("userId", {
                                userId: { $in: memberIds },
                                sessionType: "Focus",
                                completed: true,
                                startTime: { $gte: startOfToday }
                            });

                            if (activeMembersToday.length === memberIds.length) {
                                const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA");
                                if (pod.lastActiveDate === yesterdayStr) {
                                    pod.streak += 1;
                                } else {
                                    pod.streak = 1;
                                }
                                pod.lastActiveDate = todayStr;

                                const streakAct = new PodActivity({
                                    podId: pod._id,
                                    userId: req.user.id,
                                    type: "challenge",
                                    message: `Amazing! Everyone completed their sessions today! Pod streak is now ${pod.streak} days! 🚀`
                                });
                                await streakAct.save();
                            }
                        }

                        await pod.save();

                        // Emit real-time health update
                        emitToPod(req.io, pod._id.toString(), "pod:health:update", {
                            podId: pod._id,
                            healthScore: pod.healthScore
                        });

                        // 4. Accumulate XP toward any active Rivalry
                        if (xpEarned > 0) {
                            const activeRivalry = await PodRivalry.findOne({
                                $or: [
                                    { challengerPodId: pod._id, status: "active" },
                                    { challengedPodId: pod._id, status: "active" }
                                ]
                            });
                            if (activeRivalry) {
                                const isChallenger = activeRivalry.challengerPodId.toString() === pod._id.toString();
                                if (isChallenger) {
                                    activeRivalry.challengerXP += xpEarned;
                                } else {
                                    activeRivalry.challengedXP += xpEarned;
                                }
                                await activeRivalry.save();
                                // Emit rivalry XP update to both pod rooms
                                emitToPod(req.io, activeRivalry.challengerPodId.toString(), "rivalry:update", {
                                    rivalryId: activeRivalry._id,
                                    challengerXP: activeRivalry.challengerXP,
                                    challengedXP: activeRivalry.challengedXP
                                });
                                emitToPod(req.io, activeRivalry.challengedPodId.toString(), "rivalry:update", {
                                    rivalryId: activeRivalry._id,
                                    challengerXP: activeRivalry.challengerXP,
                                    challengedXP: activeRivalry.challengedXP
                                });
                            }
                        }

                        // 5. Log activity feed message (privacy-aware)
                        let taskDetail = "a task";
                        let share = true;
                        if (taskId) {
                            const taskObj = await Task.findById(taskId);
                            if (taskObj) {
                                share = taskObj.shareWithPod !== false;
                                if (share) {
                                    taskDetail = `"${taskObj.title}"`;
                                }
                            }
                        }

                        const feedMessage = share
                            ? `${user.name} completed a study session for ${taskDetail} (+${xpEarned} XP)`
                            : `${user.name} completed a study session for a private task (+${xpEarned} XP)`;

                        const act = new PodActivity({
                            podId: pod._id,
                            userId: req.user.id,
                            type: "completion",
                            message: feedMessage
                        });
                        await act.save();

                        // 5. Send notifications to other pod members
                         const otherMembers = pod.members.filter(m => m.userId && m.userId.toString() !== req.user.id);
                        const notifications = otherMembers.map(m => ({
                            userId: m.userId,
                            title: "Pod Member Progress!",
                            message: share
                                ? `${user.name} completed focus session for ${taskDetail}!`
                                : `${user.name} completed a private focus session!`,
                            type: "pod",
                            read: false
                        }));
                        if (notifications.length > 0) {
                            await Notification.insertMany(notifications);
                        }
                    }
                }
            } catch (podErr) {
                console.error("Error in FocusSocialPod gamification hook:", podErr);
            }

            // Clear presence once a Focus session is logged (completed or not)
            try {
                const userPods = await Pod.find({ "members.userId": req.user.id }).select("_id");
                await User.findByIdAndUpdate(req.user.id, {
                    activeSessionStart: null,
                    activeTaskLabel: ""
                });
                userPods.forEach(pod => {
                    emitToPod(req.io, pod._id.toString(), "presence:update", {
                        userId: req.user.id,
                        activeSessionStart: null,
                        activeTaskLabel: ""
                    });
                });
            } catch (presenceErr) {
                console.error("Error clearing presence:", presenceErr);
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

// ─── UPDATE Presence (called when timer starts/is abandoned without completing) ─
const updatePresence = async (req, res) => {
    try {
        const userId = req.user.id;
        const { active, taskLabel } = req.body;

        const update = active
            ? { activeSessionStart: new Date(), activeTaskLabel: taskLabel || "" }
            : { activeSessionStart: null, activeTaskLabel: "" };

        await User.findByIdAndUpdate(userId, update);

        // Emit presence to all pod rooms the user belongs to
        const userPods = await Pod.find({ "members.userId": userId }).select("_id");
        userPods.forEach(pod => {
            emitToPod(req.io, pod._id.toString(), "presence:update", {
                userId,
                activeSessionStart: active ? update.activeSessionStart : null,
                activeTaskLabel: update.activeTaskLabel
            });
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error updating presence." });
    }
};

module.exports = {
    logSession,
    getSessions,
    getSummary,
    updatePresence,
};
