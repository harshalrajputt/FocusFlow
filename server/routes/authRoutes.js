const express = require("express");

const router = express.Router();

// const { registerUser } = require("../controllers/authController");

// router.post("/register", registerUser);

const protect = require("../middleware/authMiddleware");

router.get(
  "/profile",
  protect,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);


const {
  registerUser,
  loginUser,
  updateUserProfile,
  updateUserPassword,
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Profile and security updates
router.put("/profile", protect, updateUserProfile);
router.put("/password", protect, updateUserPassword);

module.exports = router;