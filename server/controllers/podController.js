const Pod = require("../models/Pod");
const PodInvite = require("../models/PodInvite");
const PodActivity = require("../models/PodActivity");
const PodSprint = require("../models/PodSprint");
const PodRivalry = require("../models/PodRivalry");
const User = require("../models/User");
const FocusSession = require("../models/FocusSession");
const Notification = require("../models/Notification");
const { emitToPod, emitToUser } = require("../socket/socketHandler");

async function createAndEmitNotification(io, userId, notificationPayload) {
    try {
        const notif = await Notification.create({
            userId,
            ...notificationPayload
        });
        emitToUser(io, userId, "notification:new", notif);
        return notif;
    } catch (e) {
        console.error("Failed to create/emit notification:", e);
    }
}

async function createAndEmitNotifications(io, notificationsList) {
    try {
        if (!notificationsList || notificationsList.length === 0) return [];
        const notifs = await Notification.insertMany(notificationsList);
        notifs.forEach(notif => {
            emitToUser(io, notif.userId, "notification:new", notif);
        });
        return notifs;
    } catch (e) {
        console.error("Failed to create/emit multiple notifications:", e);
    }
}

// Create a Pod
const createPod = async (req, res) => {
    try {
        const { name, description } = req.body;
        const leaderId = req.user.id;

        if (!name || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Pod name is required." });
        }

        const pod = new Pod({
            name: name.trim(),
            description: description ? description.trim() : "",
            leaderId,
            members: [
                {
                    userId: leaderId,
                    role: "leader",
                    joinedAt: new Date()
                }
            ]
        });

        await pod.save();

        // Log activity
        const user = await User.findById(leaderId);
        const activity = new PodActivity({
            podId: pod._id,
            userId: leaderId,
            type: "join",
            message: `${user.name} created and joined the pod "${pod.name}"!`
        });
        await activity.save();

        return res.status(201).json({ success: true, pod });
    } catch (error) {
        console.error("Create pod error:", error);
        return res.status(500).json({ success: false, message: "Server error creating pod." });
    }
};

// Get User's Pods
const getUserPods = async (req, res) => {
    try {
        const userId = req.user.id;
        const pods = await Pod.find({ "members.userId": userId })
            .populate("leaderId", "name username email profilePicture")
            .populate("members.userId", "name username email profilePicture xp streak");

        return res.status(200).json({ success: true, pods });
    } catch (error) {
        console.error("Get user pods error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching pods." });
    }
};

// Get Pod Details (Members, Activity feed, Challenges, Presence, Sprint, Rivalry)
const getPodDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await Pod.findById(podId)
            .populate("leaderId", "name username email profilePicture")
            .populate("members.userId", "name username email profilePicture xp streak activeSessionStart activeTaskLabel");

        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        const isMember = pod.members.some(m => m.userId && m.userId._id && m.userId._id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You are not a member of this pod." });
        }

        // Fetch activity feed (recent 30 events)
        const activityFeed = await PodActivity.find({ podId })
            .populate("userId", "name username email profilePicture")
            .sort({ createdAt: -1 })
            .limit(30);

        // Auto-end expired sprints
        const now = new Date();
        const expiredSprints = await PodSprint.find({ podId, status: "active", endTime: { $lte: now } });
        for (const s of expiredSprints) {
            s.status = "ended";
            for (const p of s.participants) {
                p.xpEarned = 15;
                await User.findByIdAndUpdate(p.userId, { $inc: { xp: 15 } });
            }
            await s.save();
            await PodActivity.create({
                podId,
                userId: s.startedBy,
                type: "sprint",
                message: `⚡ Sprint ended! ${s.participants.length} member(s) participated and earned 15 XP each! 🎉`
            });
            emitToPod(req.io, podId, "sprint:update", { sprint: s, ended: true });
        }

        // Fetch active sprint (if any)
        const activeSprint = await PodSprint.findOne({ podId, status: "active" })
            .populate("startedBy", "name username profilePicture")
            .populate("participants.userId", "name username profilePicture");

        // Fetch active rivalry (if any)
        const activeRivalry = await PodRivalry.findOne({
            $or: [{ challengerPodId: podId }, { challengedPodId: podId }],
            status: "active"
        }).populate("challengerPodId", "name").populate("challengedPodId", "name");

        return res.status(200).json({ success: true, pod, activityFeed, activeSprint, activeRivalry });
    } catch (error) {
        console.error("Get pod details error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching pod details." });
    }
};

// Invite Friend to Pod
const inviteMember = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const { podId } = req.params;
        const { toUserId } = req.body;

        if (!toUserId) {
            return res.status(400).json({ success: false, message: "Recipient user ID is required." });
        }

        const pod = await Pod.findById(podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        const isMember = pod.members.some(m => m.userId && m.userId.toString() === fromUserId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You must be a member of the pod to invite others." });
        }

        // Check if recipient is already in pod
        const isRecipientMember = pod.members.some(m => m.userId && m.userId.toString() === toUserId);
        if (isRecipientMember) {
            return res.status(400).json({ success: false, message: "User is already a member of this pod." });
        }

        // Check if invite exists
        const existingInvite = await PodInvite.findOne({ podId, toUserId, status: "pending" });
        if (existingInvite) {
            return res.status(400).json({ success: false, message: "An invitation is already pending for this user." });
        }

        const invite = new PodInvite({
            podId,
            fromUserId,
            toUserId,
            status: "pending"
        });

        await invite.save();

        // Send a notification to recipient user
        const fromUser = await User.findById(fromUserId);
        await createAndEmitNotification(req.io, toUserId, {
            title: `Pod Invitation from ${fromUser.name}`,
            message: `${fromUser.name} invited you to join the pod "${pod.name}".`,
            type: "pod",
            read: false
        });

        return res.status(200).json({ success: true, invite });
    } catch (error) {
        console.error("Invite member error:", error);
        return res.status(500).json({ success: false, message: "Server error sending invite." });
    }
};

// Get pending invitations for logged-in user
const getPendingInvites = async (req, res) => {
    try {
        const userId = req.user.id;
        const invites = await PodInvite.find({ toUserId: userId, status: "pending" })
            .populate("fromUserId", "name username email profilePicture")
            .populate("podId", "name description");

        return res.status(200).json({ success: true, invites });
    } catch (error) {
        console.error("Get pending invites error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching invites." });
    }
};

// Respond to Pod invitation
const respondToInvite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { inviteId } = req.params;
        const { accept } = req.body;

        if (accept === undefined) {
            return res.status(400).json({ success: false, message: "Accept parameter is required." });
        }

        const invite = await PodInvite.findById(inviteId);
        if (!invite) {
            return res.status(404).json({ success: false, message: "Invitation not found." });
        }

        if (invite.toUserId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "You are not authorized to respond to this invitation." });
        }

        if (invite.status !== "pending") {
            return res.status(400).json({ success: false, message: "This invitation has already been resolved." });
        }

        if (!accept) {
            invite.status = "declined";
            await invite.save();
            return res.status(200).json({ success: true, message: "Invitation declined successfully." });
        }

        invite.status = "accepted";
        await invite.save();

        const pod = await Pod.findById(invite.podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found or has been dissolved." });
        }

        const alreadyMember = pod.members.some(m => m.userId && m.userId.toString() === userId);
        if (!alreadyMember) {
            pod.members.push({
                userId,
                role: "member",
                joinedAt: new Date()
            });

            // Initialize progress for active challenges
            pod.challenges.forEach(challenge => {
                if (challenge.status === "active") {
                    challenge.progress.set(userId, 0);
                }
            });

            await pod.save();
        }

        const user = await User.findById(userId);

        // Log join activity
        const activity = new PodActivity({
            podId: pod._id,
            userId,
            type: "join",
            message: `${user.name} joined the pod!`
        });
        await activity.save();

        // Notify other pod members
        const notifications = pod.members
            .filter(m => m.userId && m.userId.toString() !== userId)
            .map(m => ({
                userId: m.userId,
                title: "New member joined!",
                message: `${user.name} has joined "${pod.name}".`,
                type: "pod",
                read: false
            }));

        if (notifications.length > 0) {
            await createAndEmitNotifications(req.io, notifications);
        }

        return res.status(200).json({ success: true, message: "Invitation accepted. Welcome to the pod!" });
    } catch (error) {
        console.error("Respond to invite error:", error);
        return res.status(500).json({ success: false, message: "Server error responding to invite." });
    }
};

// Leave Pod
const leavePod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await Pod.findById(podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        const memberIndex = pod.members.findIndex(m => m.userId && m.userId.toString() === userId);
        if (memberIndex === -1) {
            return res.status(400).json({ success: false, message: "You are not a member of this pod." });
        }

        const user = await User.findById(userId);

        // Remove member
        pod.members.splice(memberIndex, 1);

        if (pod.members.length === 0) {
            // Dissolve pod
            await Pod.findByIdAndDelete(podId);
            await PodInvite.deleteMany({ podId });
            await PodActivity.deleteMany({ podId });
            return res.status(200).json({ success: true, message: "Pod has been dissolved because no members are left." });
        }

        // If leaving user was leader, assign new leader
        if (pod.leaderId.toString() === userId) {
            const nextLeader = pod.members[0];
            nextLeader.role = "leader";
            pod.leaderId = nextLeader.userId;
        }

        await pod.save();

        // Log exit activity
        const activity = new PodActivity({
            podId: pod._id,
            userId,
            type: "join", // Using join or completion to denote standard activities
            message: `${user.name} left the pod.`
        });
        await activity.save();

        // Notify remaining members
        const notifications = pod.members
            .filter(m => m.userId)
            .map(m => ({
                userId: m.userId,
                title: "Member left",
                message: `${user.name} has left "${pod.name}".`,
                type: "pod",
                read: false
            }));
        await createAndEmitNotifications(req.io, notifications);

        return res.status(200).json({ success: true, message: "Left pod successfully." });
    } catch (error) {
        console.error("Leave pod error:", error);
        return res.status(500).json({ success: false, message: "Server error leaving pod." });
    }
};

// Send Nudge to Pod Member
const sendNudge = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const { podId } = req.params;
        const { toUserId, nudgeType } = req.body; // nudgeType: clap, encourage, poke etc.

        if (!toUserId || !nudgeType) {
            return res.status(400).json({ success: false, message: "Recipient user ID and nudge type are required." });
        }

        const pod = await Pod.findById(podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        // Verify both in the same pod
        const isFromMember = pod.members.some(m => m.userId && m.userId.toString() === fromUserId);
        const isToMember = pod.members.some(m => m.userId && m.userId.toString() === toUserId);

        if (!isFromMember || !isToMember) {
            return res.status(403).json({ success: false, message: "Both users must be members of this pod." });
        }

        const fromUser = await User.findById(fromUserId);

        let title = "Pod Nudge!";
        let message = `${fromUser.name} nudged you!`;

        if (nudgeType === "clap") {
            title = "Kudos! 👏";
            message = `${fromUser.name} gave you a round of applause!`;
        } else if (nudgeType === "encourage") {
            title = "Keep it up! 💪";
            message = `${fromUser.name} sent you a boost of encouragement! You've got this!`;
        } else if (nudgeType === "poke") {
            title = "Poke! 👉";
            message = `${fromUser.name} poked you! Time to get to work!`;
        }

        await createAndEmitNotification(req.io, toUserId, {
            title,
            message,
            type: "pod",
            read: false
        });

        return res.status(200).json({ success: true, message: "Nudge sent successfully." });
    } catch (error) {
        console.error("Send nudge error:", error);
        return res.status(500).json({ success: false, message: "Server error sending nudge." });
    }
};

// Create a Group Challenge
const createChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;
        const { title, targetXP, endDate } = req.body;

        if (!title || !targetXP || !endDate) {
            return res.status(400).json({ success: false, message: "Title, target XP, and end date are required." });
        }

        const pod = await Pod.findById(podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        // Verify membership
        const isMember = pod.members.some(m => m.userId && m.userId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You must be a member of the pod to create challenges." });
        }

        // Initialize progress map
        const progress = new Map();
        pod.members.forEach(member => {
            if (member.userId) {
                progress.set(member.userId.toString(), 0);
            }
        });

        const newChallenge = {
            title: title.trim(),
            targetXP: Number(targetXP),
            progress,
            status: "active",
            endDate: new Date(endDate)
        };

        pod.challenges.push(newChallenge);
        await pod.save();

        const user = await User.findById(userId);

        // Log challenge activity
        const activity = new PodActivity({
            podId: pod._id,
            userId,
            type: "challenge",
            message: `${user.name} started a new group challenge: "${title.trim()}" (Target: ${targetXP} XP)!`
        });
        await activity.save();

        // Notify other pod members
        const notifications = pod.members
            .filter(m => m.userId && m.userId.toString() !== userId)
            .map(m => ({
                userId: m.userId,
                title: "New Group Challenge!",
                message: `${user.name} created a new challenge "${title.trim()}" in your pod "${pod.name}".`,
                type: "pod",
                read: false
            }));

        if (notifications.length > 0) {
            await createAndEmitNotifications(req.io, notifications);
        }

        return res.status(201).json({ success: true, challenge: pod.challenges[pod.challenges.length - 1] });
    } catch (error) {
        console.error("Create challenge error:", error);
        return res.status(500).json({ success: false, message: "Server error creating challenge." });
    }
};

// React to a Pod Activity
const reactToActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId, activityId } = req.params;
        const { emoji } = req.body;

        const ALLOWED_EMOJIS = ["🔥", "👏", "💯", "🚀"];
        if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
            return res.status(400).json({ success: false, message: "Invalid emoji. Choose from 🔥 👏 💯 🚀" });
        }

        const activity = await PodActivity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ success: false, message: "Activity not found." });
        }

        // Check pod membership
        const pod = await Pod.findById(podId);
        if (!pod || !pod.members.some(m => m.userId && m.userId.toString() === userId)) {
            return res.status(403).json({ success: false, message: "Not a pod member." });
        }

        // Remove existing reaction from this user (toggle or change)
        activity.reactions = activity.reactions.filter(r => r.userId.toString() !== userId);

        // If same emoji being sent again (toggle off), just remove — otherwise add new
        const wasToggled = req.body.toggle === true;
        if (!wasToggled) {
            activity.reactions.push({ userId, emoji, createdAt: new Date() });

            // Award 2 XP solidarity bonus to reactor
            await User.findByIdAndUpdate(userId, { $inc: { xp: 2 } });

            // Notify the original activity author (if not the reactor)
            if (activity.userId.toString() !== userId) {
                const reactor = await User.findById(userId).select("name");
                await Notification.create({
                    userId: activity.userId,
                    title: `${emoji} Reaction from ${reactor.name}!`,
                    message: `${reactor.name} reacted ${emoji} to your study session!`,
                    type: "pod",
                    read: false
                });
            }
        }

        await activity.save();

        // Emit real-time update to pod room
        emitToPod(req.io, podId, "session:reaction", {
            activityId,
            reactions: activity.reactions
        });

        return res.status(200).json({ success: true, reactions: activity.reactions });
    } catch (error) {
        console.error("React to activity error:", error);
        return res.status(500).json({ success: false, message: "Server error reacting to activity." });
    }
};

// Get Weekly Report for a Pod
const getWeeklyReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await Pod.findById(podId).populate("members.userId", "name username profilePicture");
        if (!pod) return res.status(404).json({ success: false, message: "Pod not found." });

        const isMember = pod.members.some(m => m.userId && (m.userId._id || m.userId).toString() === userId);
        if (!isMember) return res.status(403).json({ success: false, message: "Not a pod member." });

        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const memberData = [];
        let mvp = null;
        let mvpXP = -1;
        let totalPodXP = 0;

        for (const member of pod.members) {
            if (!member || !member.userId) continue;
            const uid = member.userId._id || member.userId;
            const sessions = await FocusSession.find({
                userId: uid,
                sessionType: "Focus",
                completed: true,
                startTime: { $gte: weekAgo, $lte: now }
            }).select("startTime");

            const xpEarned = Math.min(sessions.length * 10, 700); // max 100 XP/day * 7 days
            const days = new Set(sessions.map(s => new Date(s.startTime).toLocaleDateString("en-CA")));
            const consistency = days.size; // out of 7

            totalPodXP += xpEarned;
            if (xpEarned > mvpXP) {
                mvpXP = xpEarned;
                mvp = member.userId;
            }

            memberData.push({
                user: member.userId,
                xpEarned,
                daysActive: consistency,
                activeDates: [...days]
            });
        }

        return res.status(200).json({
            success: true,
            report: {
                podName: pod.name,
                podStreak: pod.streak,
                healthScore: pod.healthScore,
                totalPodXP,
                mvp: { user: mvp, xp: mvpXP },
                members: memberData,
                weekStart: weekAgo.toISOString(),
                weekEnd: now.toISOString()
            }
        });
    } catch (error) {
        console.error("Get weekly report error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching weekly report." });
    }
};

// Start a Group Sprint Room
const startSprint = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;
        const { duration } = req.body; // 30, 45, or 60

        if (![30, 45, 60].includes(Number(duration))) {
            return res.status(400).json({ success: false, message: "Duration must be 30, 45, or 60 minutes." });
        }

        const pod = await Pod.findById(podId);
        if (!pod) return res.status(404).json({ success: false, message: "Pod not found." });

        const isMember = pod.members.some(m => m.userId && m.userId.toString() === userId);
        if (!isMember) return res.status(403).json({ success: false, message: "Not a pod member." });

        // Only one active sprint per pod at a time
        const existingSprint = await PodSprint.findOne({ podId, status: "active" });
        if (existingSprint) {
            return res.status(409).json({ success: false, message: "A sprint is already active in this pod." });
        }

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + Number(duration) * 60 * 1000);

        const sprint = await PodSprint.create({
            podId,
            startedBy: userId,
            duration: Number(duration),
            startTime,
            endTime,
            participants: [{ userId, joinedAt: startTime }]
        });

        const user = await User.findById(userId).select("name");

        // Log activity
        await PodActivity.create({
            podId,
            userId,
            type: "sprint",
            message: `⚡ ${user.name} started a ${duration}-minute Group Sprint! Join now!`
        });

        // Notify all other members
        const notifications = pod.members
            .filter(m => m.userId && m.userId.toString() !== userId)
            .map(m => ({
                userId: m.userId,
                title: "⚡ Group Sprint Started!",
                message: `${user.name} started a ${duration}-min sprint in "${pod.name}". Join now!`,
                type: "pod",
                read: false
            }));
        if (notifications.length > 0) await createAndEmitNotifications(req.io, notifications);

        // Emit real-time sprint event
        const populatedSprint = await PodSprint.findById(sprint._id)
            .populate("startedBy", "name username profilePicture")
            .populate("participants.userId", "name username profilePicture");

        emitToPod(req.io, podId, "sprint:update", { sprint: populatedSprint });

        return res.status(201).json({ success: true, sprint: populatedSprint });
    } catch (error) {
        console.error("Start sprint error:", error);
        return res.status(500).json({ success: false, message: "Server error starting sprint." });
    }
};

// Join a Group Sprint Room
const joinSprint = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId, sprintId } = req.params;

        const sprint = await PodSprint.findById(sprintId);
        if (!sprint || sprint.status !== "active") {
            return res.status(404).json({ success: false, message: "No active sprint found." });
        }

        const alreadyJoined = sprint.participants.some(p => p.userId.toString() === userId);
        if (alreadyJoined) {
            return res.status(409).json({ success: false, message: "Already joined this sprint." });
        }

        sprint.participants.push({ userId, joinedAt: new Date() });
        await sprint.save();

        const populatedSprint = await PodSprint.findById(sprintId)
            .populate("startedBy", "name username profilePicture")
            .populate("participants.userId", "name username profilePicture");

        emitToPod(req.io, podId, "sprint:update", { sprint: populatedSprint });

        return res.status(200).json({ success: true, sprint: populatedSprint });
    } catch (error) {
        console.error("Join sprint error:", error);
        return res.status(500).json({ success: false, message: "Server error joining sprint." });
    }
};

// Get Active Sprint for a Pod
const getActiveSprint = async (req, res) => {
    try {
        const { podId } = req.params;

        // Auto-end expired sprints
        const now = new Date();
        const expiredSprints = await PodSprint.find({ podId, status: "active", endTime: { $lte: now } });
        for (const s of expiredSprints) {
            s.status = "ended";
            // Award 15 XP per participant
            for (const p of s.participants) {
                p.xpEarned = 15;
                await User.findByIdAndUpdate(p.userId, { $inc: { xp: 15 } });
            }
            await s.save();
            await PodActivity.create({
                podId,
                userId: s.startedBy,
                type: "sprint",
                message: `⚡ Sprint ended! ${s.participants.length} member(s) participated and earned 15 XP each! 🎉`
            });
            emitToPod(req.io, podId, "sprint:update", { sprint: s, ended: true });
        }

        const sprint = await PodSprint.findOne({ podId, status: "active" })
            .populate("startedBy", "name username profilePicture")
            .populate("participants.userId", "name username profilePicture");

        return res.status(200).json({ success: true, sprint: sprint || null });
    } catch (error) {
        console.error("Get active sprint error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching sprint." });
    }
};

// Challenge a Rival Pod
const challengeRival = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;
        const { rivalPodId } = req.body;

        if (!rivalPodId) {
            return res.status(400).json({ success: false, message: "Rival pod ID is required." });
        }
        if (rivalPodId === podId) {
            return res.status(400).json({ success: false, message: "A pod cannot challenge itself." });
        }

        const [myPod, rivalPod] = await Promise.all([
            Pod.findById(podId),
            Pod.findById(rivalPodId)
        ]);

        if (!myPod || !rivalPod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        // Only the pod leader can challenge
        if (myPod.leaderId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Only the pod leader can challenge a rival." });
        }

        // Check for existing active rivalry
        const existingRivalry = await PodRivalry.findOne({
            $or: [
                { challengerPodId: podId, status: { $in: ["pending", "active"] } },
                { challengedPodId: podId, status: { $in: ["pending", "active"] } }
            ]
        });
        if (existingRivalry) {
            return res.status(409).json({ success: false, message: "Your pod already has an active or pending rivalry." });
        }

        const rivalry = await PodRivalry.create({
            challengerPodId: podId,
            challengedPodId: rivalPodId
        });

        const challenger = await User.findById(userId).select("name");

        // Notify rival pod leader
        await createAndEmitNotification(req.io, rivalPod.leaderId, {
            title: `⚔️ Pod Challenge from "${myPod.name}"!`,
            message: `` + `"${myPod.name}" has challenged your pod to a 7-day XP battle! Accept or decline in Social Pods.`,
            type: "pod",
            read: false
        });

        return res.status(201).json({ success: true, rivalry });
    } catch (error) {
        console.error("Challenge rival error:", error);
        return res.status(500).json({ success: false, message: "Server error challenging rival." });
    }
};

// Respond to a Rival Challenge
const respondToRivalChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rivalryId } = req.params;
        const { accept } = req.body;

        const rivalry = await PodRivalry.findById(rivalryId);
        if (!rivalry || rivalry.status !== "pending") {
            return res.status(404).json({ success: false, message: "Rivalry challenge not found or already resolved." });
        }

        const challengedPod = await Pod.findById(rivalry.challengedPodId);
        if (!challengedPod || challengedPod.leaderId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Only the challenged pod's leader can respond." });
        }

        if (!accept) {
            rivalry.status = "declined";
            await rivalry.save();
            return res.status(200).json({ success: true, message: "Challenge declined." });
        }

        const now = new Date();
        rivalry.status = "active";
        rivalry.startDate = now;
        rivalry.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await rivalry.save();

        const challengerPod = await Pod.findById(rivalry.challengerPodId);

        // Notify both pods
        const challengerNotifs = challengerPod.members
            .filter(m => m.userId)
            .map(m => ({
                userId: m.userId,
                title: `⚔️ Rivalry ACCEPTED!`,
                message: `"${challengedPod.name}" accepted your challenge! The 7-day XP battle has begun!`,
                type: "pod",
                read: false
            }));
        const challengedNotifs = challengedPod.members
            .filter(m => m.userId)
            .map(m => ({
                userId: m.userId,
                title: `⚔️ Rivalry BEGINS!`,
                message: `Your pod has entered a 7-day XP battle vs "${challengerPod.name}"! Start studying!`,
                type: "pod",
                read: false
            }));
        await createAndEmitNotifications(req.io, [...challengerNotifs, ...challengedNotifs]);

        // Emit to both pod rooms
        const populatedRivalry = await PodRivalry.findById(rivalryId)
            .populate("challengerPodId", "name")
            .populate("challengedPodId", "name");

        emitToPod(req.io, rivalry.challengerPodId.toString(), "rivalry:update", {
            rivalry: populatedRivalry
        });
        emitToPod(req.io, rivalry.challengedPodId.toString(), "rivalry:update", {
            rivalry: populatedRivalry
        });

        return res.status(200).json({ success: true, rivalry: populatedRivalry });
    } catch (error) {
        console.error("Respond to rivalry error:", error);
        return res.status(500).json({ success: false, message: "Server error responding to rivalry." });
    }
};

// Get Active or Pending Rivalry for a Pod
const getRivalryStatus = async (req, res) => {
    try {
        const { podId } = req.params;

        const rivalry = await PodRivalry.findOne({
            $or: [{ challengerPodId: podId }, { challengedPodId: podId }],
            status: { $in: ["pending", "active"] }
        }).populate("challengerPodId", "name").populate("challengedPodId", "name");

        return res.status(200).json({ success: true, rivalry: rivalry || null });
    } catch (error) {
        console.error("Get rivalry status error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching rivalry." });
    }
};

const updatePodSettings = async (req, res) => {
    try {
        const { podId } = req.params;
        const { minSessionDuration } = req.body;
        const userId = req.user.id;

        const pod = await Pod.findById(podId);
        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        if (pod.leaderId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Only the pod leader can update settings." });
        }

        if (minSessionDuration !== undefined) {
            const minSecs = Number(minSessionDuration);
            if (isNaN(minSecs) || minSecs < 0) {
                return res.status(400).json({ success: false, message: "Invalid minimum session duration." });
            }
            pod.minSessionDuration = minSecs;
        }

        await pod.save();

        return res.status(200).json({ success: true, pod });
    } catch (error) {
        console.error("Update pod settings error:", error);
        return res.status(500).json({ success: false, message: "Server error updating pod settings." });
    }
};

module.exports = {
    createPod,
    getUserPods,
    getPodDetails,
    inviteMember,
    getPendingInvites,
    respondToInvite,
    leavePod,
    sendNudge,
    createChallenge,
    reactToActivity,
    getWeeklyReport,
    startSprint,
    joinSprint,
    getActiveSprint,
    challengeRival,
    respondToRivalChallenge,
    getRivalryStatus,
    updatePodSettings
};
