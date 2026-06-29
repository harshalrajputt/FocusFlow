const mongoose = require("mongoose");

const podSprintSchema = new mongoose.Schema(
    {
        podId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            required: true
        },
        startedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        duration: {
            type: Number, // in minutes: 30, 45, or 60
            enum: [30, 45, 60],
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["active", "ended"],
            default: "active"
        },
        participants: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                joinedAt: {
                    type: Date,
                    default: Date.now
                },
                completedAt: {
                    type: Date,
                    default: null
                },
                xpEarned: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

podSprintSchema.index({ podId: 1, status: 1 });

module.exports = mongoose.model("PodSprint", podSprintSchema);
