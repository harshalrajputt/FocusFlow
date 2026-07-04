const mongoose = require("mongoose");

const weeklyWebsiteUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        weekStartDate: {
            type: String, // YYYY-MM-DD (format of Monday starting the week)
            required: true
        },
        domain: {
            type: String,
            required: true
        },
        timeSpent: {
            type: Number, // total accumulated seconds for the week
            default: 0
        },
        category: {
            type: String,
            enum: ["Productive", "Neutral", "Distracting"],
            default: "Neutral"
        }
    },
    {
        timestamps: true
    }
);

// Ensure unique index per user, week, domain, and category
weeklyWebsiteUsageSchema.index({ userId: 1, weekStartDate: 1, domain: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyWebsiteUsage", weeklyWebsiteUsageSchema);
