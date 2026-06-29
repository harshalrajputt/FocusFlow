/**
 * podHealthJob.js
 * Cron job that manages the Pod Health Bar.
 *
 * Schedule:
 *   Every 6 hours — deplete health for idle pods
 *   (health is replenished directly in focusController.js on session completion)
 */

const cron = require("node-cron");
const Pod = require("../models/Pod");
const Notification = require("../models/Notification");
const { emitToPod } = require("../socket/socketHandler");

const DECAY_AMOUNT = 15;    // HP lost per 6-hour window of inactivity
const REPLENISH_AMOUNT = 20; // HP gained per completed focus session (applied in focusController)
const CRITICAL_THRESHOLD = 20;

module.exports = (io) => {
    // Run every 6 hours
    cron.schedule("0 */6 * * *", async () => {
        console.log("[podHealthJob] Running health decay check...");
        try {
            const pods = await Pod.find({});
            const now = new Date();

            for (const pod of pods) {
                const lastDecay = pod.lastHealthDecay || pod.createdAt || now;
                const hoursSinceDecay = (now - new Date(lastDecay)) / (1000 * 60 * 60);

                if (hoursSinceDecay < 6) continue; // Not yet time to decay

                // Check if any member was active in the last 6 hours
                const FocusSession = require("../models/FocusSession");
                const memberIds = pod.members.map((m) => m.userId);
                const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);

                const recentActivity = await FocusSession.countDocuments({
                    userId: { $in: memberIds },
                    sessionType: "Focus",
                    completed: true,
                    startTime: { $gte: sixHoursAgo }
                });

                if (recentActivity === 0) {
                    pod.healthScore = Math.max(0, (pod.healthScore ?? 100) - DECAY_AMOUNT);
                }

                pod.lastHealthDecay = now;
                await pod.save();

                // Emit real-time health update to pod room
                emitToPod(io, pod._id.toString(), "pod:health:update", {
                    podId: pod._id,
                    healthScore: pod.healthScore
                });

                // Notify members when health goes critical
                if (pod.healthScore < CRITICAL_THRESHOLD) {
                    const notifications = pod.members.map((m) => ({
                        userId: m.userId,
                        title: "⚠️ Pod Health is Critical!",
                        message: `Your pod "${pod.name}" needs attention! Log a focus session to save your pod's health.`,
                        type: "pod",
                        read: false
                    }));
                    if (notifications.length > 0) {
                        await Notification.insertMany(notifications);
                    }
                }
            }

            console.log("[podHealthJob] Health decay check complete.");
        } catch (err) {
            console.error("[podHealthJob] Error:", err.message);
        }
    });

    console.log("[podHealthJob] Scheduled (every 6 hours).");
};

module.exports.REPLENISH_AMOUNT = REPLENISH_AMOUNT;
