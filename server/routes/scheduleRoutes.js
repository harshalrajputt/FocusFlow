const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    getSchedule,
    generateBaselineSchedule,
    updateSchedule,
    getMissedSessions,
    recoverSession,
    getAdaptiveSuggestions
} = require("../controllers/scheduleController");

// Protect all scheduling endpoints
router.use(protect);

router.get("/", getSchedule);
router.post("/generate", generateBaselineSchedule);
router.put("/", updateSchedule);
router.get("/missed-sessions", getMissedSessions);
router.post("/recover", recoverSession);
router.get("/adaptive-suggestions", getAdaptiveSuggestions);

module.exports = router;
