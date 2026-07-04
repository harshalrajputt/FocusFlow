const mongoose = require("mongoose");

const websiteUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true,
        },
        domain: {
            type: String,
            required: true,
        },
        timeSpent: {
            type: Number, // duration in seconds
            default: 0,
        },
        category: {
            type: String,
            enum: ["Productive", "Neutral", "Distracting"],
            default: "Neutral",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to quickly find and update domain logs per user per date per category
websiteUsageSchema.index({ userId: 1, date: 1, domain: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("WebsiteUsage", websiteUsageSchema);
