const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { transformNotes } = require("../controllers/aiController");

router.use(protect);

router.post("/transform-notes", transformNotes);

module.exports = router;
