const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getNotifications, markNotificationRead, clearNotification } = require("../controllers/notificationController");

router.use(protect);

router.get("/", getNotifications);
router.put("/:id/read", markNotificationRead);
router.delete("/:id", clearNotification);

module.exports = router;
