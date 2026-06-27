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
    createChallenge
} = require("../controllers/podController");

router.use(protect);

router.post("/", createPod);
router.get("/", getUserPods);
router.get("/invites", getPendingInvites);
router.post("/invites/:inviteId/respond", respondToInvite);
router.get("/:podId", getPodDetails);
router.post("/:podId/invite", inviteMember);
router.post("/:podId/leave", leavePod);
router.post("/:podId/nudge", sendNudge);
router.post("/:podId/challenges", createChallenge);

module.exports = router;
