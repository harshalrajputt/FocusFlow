const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    getSchedule,
    generateBaselineSchedule,
    updateSchedule
} = require("../controllers/scheduleController");

// Protect all scheduling endpoints
router.use(protect);

router.get("/", getSchedule);
router.post("/generate", generateBaselineSchedule);
router.put("/", updateSchedule);

module.exports = router;
