const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { logWebsiteUsage, getDailyStats } = require("../controllers/websiteUsageController");

// Protect all endpoints
router.use(protect);

router.post("/log", logWebsiteUsage);
router.get("/stats", getDailyStats);

module.exports = router;
