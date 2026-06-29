const Pod = require("../models/Pod");
const PodInvite = require("../models/PodInvite");
const PodActivity = require("../models/PodActivity");
const User = require("../models/User");
const Notification = require("../models/Notification");

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

// Get Pod Details (Members, Activity feed, Challenges)
const getPodDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await Pod.findById(podId)
            .populate("leaderId", "name username email profilePicture")
            .populate("members.userId", "name username email profilePicture xp streak");

        if (!pod) {
            return res.status(404).json({ success: false, message: "Pod not found." });
        }

        // Check membership
        const isMember = pod.members.some(m => m.userId._id.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You are not a member of this pod." });
        }

        // Fetch activity feed (recent 30 events)
        const activityFeed = await PodActivity.find({ podId })
            .populate("userId", "name username email profilePicture")
            .sort({ createdAt: -1 })
            .limit(30);

        return res.status(200).json({ success: true, pod, activityFeed });
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

        // Check if inviter is in pod
        const isMember = pod.members.some(m => m.userId.toString() === fromUserId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You must be a member of the pod to invite others." });
        }

        // Check if recipient is already in pod
        const isRecipientMember = pod.members.some(m => m.userId.toString() === toUserId);
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
        await Notification.create({
            userId: toUserId,
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

        // Check if already in pod (safeguard)
        const alreadyMember = pod.members.some(m => m.userId.toString() === userId);
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
            .filter(m => m.userId.toString() !== userId)
            .map(m => ({
                userId: m.userId,
                title: "New member joined!",
                message: `${user.name} has joined "${pod.name}".`,
                type: "pod",
                read: false
            }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
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

        const memberIndex = pod.members.findIndex(m => m.userId.toString() === userId);
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
        const notifications = pod.members.map(m => ({
            userId: m.userId,
            title: "Member left",
            message: `${user.name} has left "${pod.name}".`,
            type: "pod",
            read: false
        }));
        await Notification.insertMany(notifications);

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
        const isFromMember = pod.members.some(m => m.userId.toString() === fromUserId);
        const isToMember = pod.members.some(m => m.userId.toString() === toUserId);

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

        await Notification.create({
            userId: toUserId,
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
        const isMember = pod.members.some(m => m.userId.toString() === userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You must be a member of the pod to create challenges." });
        }

        // Initialize progress map
        const progress = new Map();
        pod.members.forEach(member => {
            progress.set(member.userId.toString(), 0);
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
            .filter(m => m.userId.toString() !== userId)
            .map(m => ({
                userId: m.userId,
                title: "New Group Challenge!",
                message: `${user.name} created a new challenge "${title.trim()}" in your pod "${pod.name}".`,
                type: "pod",
                read: false
            }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        return res.status(201).json({ success: true, challenge: pod.challenges[pod.challenges.length - 1] });
    } catch (error) {
        console.error("Create challenge error:", error);
        return res.status(500).json({ success: false, message: "Server error creating challenge." });
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
    createChallenge
};
