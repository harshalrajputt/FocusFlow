const mongoose = require("mongoose");

const podActivitySchema = new mongoose.Schema(
    {
        podId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ["completion", "miss", "recovery", "join", "challenge", "sprint", "reaction"],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },

        // Emoji reactions on completion-type activities
        reactions: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                emoji: { type: String, enum: ["🔥", "👏", "💯", "🚀"], required: true },
                createdAt: { type: Date, default: Date.now }
            }
        ]
    }
);

// Indexes
podActivitySchema.index({ podId: 1, createdAt: -1 });

module.exports = mongoose.model("PodActivity", podActivitySchema);
