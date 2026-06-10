const Notification = require("../models/Notification");
const Schedule = require("../models/Schedule");
const FocusSession = require("../models/FocusSession");

// Helper to run dynamic checks for missed study sessions on request
const checkMissedSessions = async (userId) => {
    try {
        const schedule = await Schedule.findOne({ userId });
        if (!schedule) return;

        const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const now = new Date();
        const todayName = weekdays[now.getDay()];
        const localDateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD

        const daySchedule = schedule.days?.find(d => d.dayName === todayName);
        if (!daySchedule || !daySchedule.events) return;

        // Fetch study events for today
        const studyEvents = daySchedule.events.filter(e => e.type === "study");
        if (studyEvents.length === 0) return;

        // Fetch completed focus sessions today
        const startOfToday = new Date(localDateStr + "T00:00:00");
        const endOfToday = new Date(localDateStr + "T23:59:59");
        const focusSessions = await FocusSession.find({
            userId,
            sessionType: "Focus",
            startTime: { $gte: startOfToday, $lte: endOfToday }
        });

        for (const event of studyEvents) {
            const [startH, startM] = event.startTime.split(":").map(Number);
            const [endH, endM] = event.endTime.split(":").map(Number);

            const eventStart = new Date();
            eventStart.setHours(startH, startM, 0, 0);

            const eventEnd = new Date();
            eventEnd.setHours(endH, endM, 0, 0);

            // Only alert on events that have completely ended
            if (now > eventEnd) {
                // Check if any focus session matches this scheduled event slot (+/- 30 mins buffer)
                const matches = focusSessions.some(s => {
                    const sTime = new Date(s.startTime);
                    const windowStart = new Date(eventStart.getTime() - 30 * 60 * 1000);
                    const windowEnd = new Date(eventEnd.getTime() + 30 * 60 * 1000);
                    return sTime >= windowStart && sTime <= windowEnd;
                });

                if (!matches) {
                    // Check if alert notification was already created today to prevent spam
                    const existing = await Notification.findOne({
                        userId,
                        type: "missed_session",
                        title: `Missed Study Session: ${event.title}`,
                        createdAt: { $gte: startOfToday }
                    });

                    if (!existing) {
                        await Notification.create({
                            userId,
                            title: `Missed Study Session: ${event.title}`,
                            message: `You missed your scheduled study slot "${event.title}" (${event.startTime} - ${event.endTime}) today. Let's get back on track!`,
                            type: "missed_session",
                            read: false
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error in checkMissedSessions helper:", err);
    }
};

// Fetch notifications
const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        await checkMissedSessions(userId);
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(25);
        return res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error getting notifications:", error);
        return res.status(500).json({ success: false, message: "Server error fetching notifications." });
    }
};

// Mark as read
const markNotificationRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { read: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        return res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Error marking notification read:", error);
        return res.status(500).json({ success: false, message: "Server error updating notification." });
    }
};

// Clear notification
const clearNotification = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const result = await Notification.findOneAndDelete({ _id: id, userId });
        if (!result) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        return res.status(200).json({ success: true, message: "Notification cleared successfully." });
    } catch (error) {
        console.error("Error clearing notification:", error);
        return res.status(500).json({ success: false, message: "Server error deleting notification." });
    }
};

module.exports = {
    getNotifications,
    markNotificationRead,
    clearNotification
};
