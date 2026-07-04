const mongoose = require("mongoose");

const monthlyWebsiteUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        monthStartDate: {
            type: String, // YYYY-MM-01 (format of 1st of the month)
            required: true
        },
        domain: {
            type: String,
            required: true
        },
        timeSpent: {
            type: Number, // total accumulated seconds for the month
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

// Ensure unique index per user, month, domain, and category
monthlyWebsiteUsageSchema.index({ userId: 1, monthStartDate: 1, domain: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyWebsiteUsage", monthlyWebsiteUsageSchema);
