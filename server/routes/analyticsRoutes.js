const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getInsights, applyRecommendation } = require("../controllers/analyticsController");

// Protect all analytics insight routes
router.use(protect);

router.get("/insights", getInsights);
router.post("/recommend", applyRecommendation);

module.exports = router;
