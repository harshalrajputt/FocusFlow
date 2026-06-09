const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    getProfile,
    upsertProfile,
    completeOnboarding
} = require("../controllers/userProfileController");

// All profile routes are protected by auth middleware
router.use(protect);

router.get("/", getProfile);
router.put("/", upsertProfile);
router.put("/complete", completeOnboarding);

module.exports = router;
