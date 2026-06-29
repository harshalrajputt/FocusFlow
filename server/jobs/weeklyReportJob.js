/**
 * weeklyReportJob.js
 * Two cron jobs:
 *   1. Sunday 8 PM IST (14:30 UTC) — Weekly Pod Report Card
 *   2. Daily 9 PM IST (15:30 UTC)  — Daily Pod Summary notification
 *
 * Also handles ending expired Rival Pod battles and declaring winners.
 */

const cron = require("node-cron");
const Pod = require("../models/Pod");
const FocusSession = require("../models/FocusSession");
const User = require("../models/User");
const Notification = require("../models/Notification");
const PodActivity = require("../models/PodActivity");
const { emitToUser, emitToPod } = require("../socket/socketHandler");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate per-member XP contributions over a date range.
 */
const getMemberXPInRange = async (memberIds, startDate, endDate) => {
    const results = {};
    for (const userId of memberIds) {
        const sessions = await FocusSession.find({
            userId,
            sessionType: "Focus",
            completed: true,
            startTime: { $gte: startDate, $lte: endDate }
        });
        // 10 XP per session, capped at 10 sessions per day (already enforced at log time)
        results[userId.toString()] = sessions.length * 10;
    }
    return results;
};

/**
 * Calculate member consistency (days active out of 7).
 */
const getMemberConsistency = async (memberIds, startDate) => {
    const results = {};
    for (const userId of memberIds) {
        const sessions = await FocusSession.find({
            userId,
            sessionType: "Focus",
            completed: true,
            startTime: { $gte: startDate }
        }).select("startTime");

        const days = new Set(
            sessions.map((s) => new Date(s.startTime).toLocaleDateString("en-CA"))
        );
        results[userId.toString()] = days.size;
    }
    return results;
};

// ─── Weekly Report Card (Sundays 8 PM IST) ────────────────────────────────────
const runWeeklyReport = async (io) => {
    console.log("[weeklyReportJob] Generating weekly report cards...");
    try {
        const pods = await Pod.find({}).populate("members.userId", "name username");
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        for (const pod of pods) {
            const memberIds = pod.members.map((m) => m.userId._id || m.userId);
            if (memberIds.length === 0) continue;

            const xpMap = await getMemberXPInRange(memberIds, weekAgo, now);
            const consistencyMap = await getMemberConsistency(memberIds, weekAgo);

            const totalPodXP = Object.values(xpMap).reduce((a, b) => a + b, 0);
            let mvpId = null;
            let mvpXP = -1;
            Object.entries(xpMap).forEach(([uid, xp]) => {
                if (xp > mvpXP) { mvpXP = xp; mvpId = uid; }
            });

            const mvpMember = pod.members.find(
                (m) => (m.userId._id || m.userId).toString() === mvpId
            );
            const mvpName = mvpMember?.userId?.name || "Unknown";

            // Create summary activity entry
            const summaryMsg =
                `📊 Weekly Report — Pod earned ${totalPodXP} XP this week! ` +
                `🏆 MVP: ${mvpName} (${mvpXP} XP). ` +
                `Streak: ${pod.streak} days.`;

            await PodActivity.create({
                podId: pod._id,
                userId: pod.leaderId,
                type: "challenge",
                message: summaryMsg
            });

            // Notify every member
            const notifications = pod.members.map((m) => ({
                userId: m.userId._id || m.userId,
                title: "📊 Your Pod's Weekly Report is Ready!",
                message: `${pod.name} earned ${totalPodXP} XP this week. MVP: ${mvpName}. Check your pod!`,
                type: "pod",
                read: false
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                // Emit real-time notifications
                pod.members.forEach((m) => {
                    const uid = (m.userId._id || m.userId).toString();
                    emitToUser(io, uid, "notification:new", {
                        title: "📊 Weekly Report Ready!",
                        message: `Check ${pod.name}'s weekly report card.`
                    });
                });
            }
        }

        console.log("[weeklyReportJob] Weekly reports generated.");
    } catch (err) {
        console.error("[weeklyReportJob] Weekly report error:", err.message);
    }
};

// ─── Daily Summary (Every day 9 PM IST = 15:30 UTC) ──────────────────────────
const runDailySummary = async (io) => {
    console.log("[weeklyReportJob] Generating daily pod summaries...");
    try {
        const pods = await Pod.find({}).populate("members.userId", "name");
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        for (const pod of pods) {
            const memberIds = pod.members.map((m) => m.userId._id || m.userId);
            if (memberIds.length === 0) continue;

            const xpMap = await getMemberXPInRange(memberIds, startOfToday, now);
            const totalTodayXP = Object.values(xpMap).reduce((a, b) => a + b, 0);
            if (totalTodayXP === 0) continue; // Skip pods with no activity today

            let topContributorName = "";
            let topXP = -1;
            pod.members.forEach((m) => {
                const uid = (m.userId._id || m.userId).toString();
                if ((xpMap[uid] || 0) > topXP) {
                    topXP = xpMap[uid] || 0;
                    topContributorName = m.userId?.name || "Someone";
                }
            });

            const notifications = pod.members.map((m) => ({
                userId: m.userId._id || m.userId,
                title: `🌙 ${pod.name} — Today's Summary`,
                message: `Your pod earned ${totalTodayXP} XP today! 🔥 Top contributor: ${topContributorName}. Pod streak: ${pod.streak} days.`,
                type: "pod",
                read: false
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                pod.members.forEach((m) => {
                    const uid = (m.userId._id || m.userId).toString();
                    emitToUser(io, uid, "notification:new", {
                        title: `🌙 ${pod.name} Daily Summary`,
                        message: `Pod earned ${totalTodayXP} XP today. Streak: ${pod.streak} days.`
                    });
                });
            }
        }

        console.log("[weeklyReportJob] Daily summaries sent.");
    } catch (err) {
        console.error("[weeklyReportJob] Daily summary error:", err.message);
    }
};

// ─── Rival Pods Battle Resolution ─────────────────────────────────────────────
const resolveExpiredRivalries = async (io) => {
    try {
        const PodRivalry = require("../models/PodRivalry");
        const now = new Date();
        const expiredRivalries = await PodRivalry.find({
            status: "active",
            endDate: { $lte: now }
        });

        for (const rivalry of expiredRivalries) {
            rivalry.status = "completed";
            let winnerId = null;
            let winnerName = "";
            let loserName = "";

            const challengerPod = await Pod.findById(rivalry.challengerPodId);
            const challengedPod = await Pod.findById(rivalry.challengedPodId);
            if (!challengerPod || !challengedPod) {
                await rivalry.save();
                continue;
            }

            if (rivalry.challengerXP >= rivalry.challengedXP) {
                winnerId = rivalry.challengerPodId;
                winnerName = challengerPod.name;
                loserName = challengedPod.name;
            } else {
                winnerId = rivalry.challengedPodId;
                winnerName = challengedPod.name;
                loserName = challengerPod.name;
            }

            rivalry.winnerId = winnerId;
            await rivalry.save();

            // Award badge to winning pod
            await Pod.findByIdAndUpdate(winnerId, {
                $push: { badges: { type: "rivalry_win", earnedAt: now } }
            });

            // Notify both pods
            const allMembers = [
                ...challengerPod.members.map((m) => ({ userId: m.userId, podName: challengerPod.name })),
                ...challengedPod.members.map((m) => ({ userId: m.userId, podName: challengedPod.name }))
            ];

            const notifications = allMembers.map((m) => ({
                userId: m.userId,
                title: `⚔️ Rivalry Over — ${winnerName} Wins!`,
                message: `The pod battle between ${winnerName} and ${loserName} has ended. ${winnerName} wins with more XP! ${m.podName === winnerName ? "🏆 You earned a badge!" : "Better luck next time!"}`,
                type: "pod",
                read: false
            }));
            await Notification.insertMany(notifications);

            // Emit to both pod rooms
            [rivalry.challengerPodId, rivalry.challengedPodId].forEach((podId) => {
                emitToPod(io, podId.toString(), "rivalry:update", {
                    rivalryId: rivalry._id,
                    status: "completed",
                    winnerId,
                    winnerName
                });
            });
        }
    } catch (err) {
        console.error("[weeklyReportJob] Rivalry resolution error:", err.message);
    }
};

// ─── Export module that registers all cron jobs ──────────────────────────────
module.exports = (io) => {
    // Weekly report — Sunday 8 PM IST (14:30 UTC)
    cron.schedule("30 14 * * 0", () => runWeeklyReport(io));

    // Daily summary — Every day 9 PM IST (15:30 UTC)
    cron.schedule("30 15 * * *", () => runDailySummary(io));

    // Check for expired rivalries — Every hour
    cron.schedule("0 * * * *", () => resolveExpiredRivalries(io));

    console.log("[weeklyReportJob] Scheduled (weekly + daily + rivalry resolver).");
};
