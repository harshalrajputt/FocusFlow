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
  forgotPassword,
  resetPassword,
  searchUsers,
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Profile and security updates
router.put("/profile", protect, updateUserProfile);
router.put("/password", protect, updateUserPassword);
router.get("/search", protect, searchUsers);

module.exports = router;