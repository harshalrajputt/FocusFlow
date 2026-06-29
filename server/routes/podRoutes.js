const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
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
    getRivalryStatus
} = require("../controllers/podController");

router.use(protect);

router.post("/", createPod);
router.get("/", getUserPods);
router.get("/invites", getPendingInvites);
router.post("/invites/:inviteId/respond", respondToInvite);
router.post("/rivalries/:rivalryId/respond", respondToRivalChallenge);

router.get("/:podId", getPodDetails);
router.post("/:podId/invite", inviteMember);
router.post("/:podId/leave", leavePod);
router.post("/:podId/nudge", sendNudge);
router.post("/:podId/challenges", createChallenge);

// Reactions on activity feed items
router.post("/:podId/activities/:activityId/react", reactToActivity);

// Weekly report card
router.get("/:podId/weekly-report", getWeeklyReport);

// Group Sprint Rooms
router.post("/:podId/sprints", startSprint);
router.post("/:podId/sprints/:sprintId/join", joinSprint);
router.get("/:podId/sprints/active", getActiveSprint);

// Rival Pods
router.post("/:podId/rival-challenge", challengeRival);
router.get("/:podId/rivalry", getRivalryStatus);

module.exports = router;
