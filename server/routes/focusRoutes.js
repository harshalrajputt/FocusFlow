const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    logSession,
    getSessions,
    getSummary,
} = require("../controllers/focusController");

// All focus routes are protected
router.use(protect);

router.route("/")
    .post(logSession)
    .get(getSessions);

router.route("/summary")
    .get(getSummary);

module.exports = router;
