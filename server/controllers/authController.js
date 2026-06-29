const User = require("../models/User");
const UserProfile = require("../models/UserProfile");
const bcrypt = require("bcryptjs");
const { sendOTPEmail } = require("../utils/emailService");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        // Validation
        if (!name || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Username validation
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3-20 characters long and contain only letters, numbers, and underscores.",
            });
        }

        // Check existing email
        const existingUserEmail = await User.findOne({ email });
        if (existingUserEmail) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
        }

        // Check existing username
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: "Username is already taken",
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            username: username.toLowerCase().trim(),
            hasSetUsername: true,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};



const jwt = require("jsonwebtoken");
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // Find User
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials",
            });
        }

        // Compare Password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials",
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                userId: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // Check onboarding status
        const profile = await UserProfile.findOne({ userId: user._id });
        const onboardingCompleted = profile ? profile.onboardingCompleted : false;

        res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                timezone: user.timezone,
                settings: user.settings,
                profilePicture: user.profilePicture || "",
                onboardingCompleted,
                hasSetUsername: user.hasSetUsername,
            },
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};



const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const { name, username, email, timezone, settings, profilePicture } = req.body;

        if (name !== undefined) user.name = name.trim();
        if (username !== undefined) {
            const usernameVal = username.toLowerCase().trim();
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(usernameVal)) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be 3-20 characters long and contain only letters, numbers, and underscores."
                });
            }
            const usernameExists = await User.findOne({ username: usernameVal, _id: { $ne: user._id } });
            if (usernameExists) {
                return res.status(400).json({
                    success: false,
                    message: "Username is already taken"
                });
            }
            user.username = usernameVal;
            user.hasSetUsername = true;
        }
        if (email !== undefined) {
            const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already in use by another account",
                });
            }
            user.email = email.trim();
        }
        if (timezone !== undefined) user.timezone = timezone;
        if (profilePicture !== undefined) {
            if (profilePicture && profilePicture.startsWith("data:image/")) {
                try {
                    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
                        const uploadResponse = await cloudinary.uploader.upload(profilePicture, {
                            folder: "focusflow_avatars",
                            resource_type: "image"
                        });
                        user.profilePicture = uploadResponse.secure_url;
                    } else {
                        user.profilePicture = profilePicture;
                    }
                } catch (cloudinaryErr) {
                    console.error("Cloudinary upload failed, falling back to base64:", cloudinaryErr);
                    user.profilePicture = profilePicture;
                }
            } else {
                user.profilePicture = profilePicture;
            }
        }
        if (settings !== undefined) {
            user.settings = {
                notifications: {
                    ...user.settings?.notifications,
                    ...settings.notifications,
                },
                appearance: {
                    ...user.settings?.appearance,
                    ...settings.appearance,
                }
            };
        }

        await user.save();

        const profile = await UserProfile.findOne({ userId: user._id });
        const onboardingCompleted = profile ? profile.onboardingCompleted : false;

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                timezone: user.timezone,
                settings: user.settings,
                profilePicture: user.profilePicture || "",
                onboardingCompleted,
                hasSetUsername: user.hasSetUsername,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while updating profile",
            error: error.message,
        });
    }
};

const updateUserPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required",
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect current password",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters long",
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while updating password",
            error: error.message,
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found with this email" });
        }

        // Daily OTP Rate Limit Check (maximum 2 requests per calendar day)
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (user.resetOTPRequests && user.resetOTPRequests.lastRequestDate && user.resetOTPRequests.lastRequestDate >= todayStart) {
            if (user.resetOTPRequests.count >= 2) {
                return res.status(429).json({
                    success: false,
                    message: "You have exceeded the maximum limit of 2 password reset requests per day."
                });
            }
            user.resetOTPRequests.count += 1;
        } else {
            user.resetOTPRequests = {
                count: 1,
                lastRequestDate: now
            };
        }
        user.resetOTPRequests.lastRequestDate = now;

        // Generate a 6-digit numeric OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Save OTP and set expiry (10 minutes)
        user.resetOTP = otp;
        user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        console.log(`[PASSWORD RESET OTP] Generated OTP for ${email}: ${otp}`);

        // Send Email
        await sendOTPEmail(email, otp);

        // Return response (include devOTP if no SMTP_USER or SMTP_PASS configured for easier dev testing)
        const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
        return res.status(200).json({
            success: true,
            message: "A 6-digit verification code has been generated.",
            ...(smtpConfigured ? {} : { devOTP: otp })
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ success: false, message: "Server error during password reset" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if OTP matches and is not expired
        if (!user.resetOTP || user.resetOTP !== otp || !user.resetOTPExpires || user.resetOTPExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP fields
        user.resetOTP = null;
        user.resetOTPExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now login with your new password."
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ success: false, message: "Server error resetting password" });
    }
};

const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        // Exclude current user from search
        const currentUserId = req.user.id;

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { username: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        })
            .select("name username email profilePicture xp streak")
            .limit(10);

        res.status(200).json({
            success: true,
            users
        });
    } catch (error) {
        console.error("Search users error:", error);
        res.status(500).json({
            success: false,
            message: "Server error searching users"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updateUserProfile,
    updateUserPassword,
    forgotPassword,
    resetPassword,
    searchUsers,
};