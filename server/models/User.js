const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        username: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true
        },

        hasSetUsername: {
            type: Boolean,
            default: false
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        timezone: {
            type: String,
            default: "UTC+05:30 — India"
        },

        settings: {
            notifications: {
                sessionReminders: { type: Boolean, default: true },
                taskDueAlerts: { type: Boolean, default: true },
                weeklySummary: { type: Boolean, default: false },
                breakReminders: { type: Boolean, default: true },
                soundEffects: { type: Boolean, default: true }
            },
            appearance: {
                theme: { type: String, default: "Dark (default)" },
                compactSidebar: { type: Boolean, default: false },
                reduceMotion: { type: Boolean, default: false },
                denseLayout: { type: Boolean, default: false }
            }
        },
        resetOTP: {
            type: String,
            default: null
        },
        resetOTPExpires: {
            type: Date,
            default: null
        },
        profilePicture: {
            type: String,
            default: ""
        },
        resetOTPRequests: {
            count: { type: Number, default: 0 },
            lastRequestDate: { type: Date, default: null }
        },
        xp: {
            type: Number,
            default: 0
        },
        streak: {
            type: Number,
            default: 0
        },
        lastActiveDate: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);