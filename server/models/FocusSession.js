const mongoose = require("mongoose");

const focusSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        sessionType: {
            type: String,
            enum: ["Focus", "Short Break", "Long Break"],
            required: true,
        },
        duration: {
            type: Number, // duration in seconds
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        completed: {
            type: Boolean,
            default: true,
        },
        interruptions: {
            type: Number,
            default: 0,
        },
        pauseCount: {
            type: Number,
            default: 0,
        },
        followedSchedule: {
            type: Boolean,
            default: true,
        },
        missedTask: {
            type: Boolean,
            default: false,
        },
        delayedTask: {
            type: Boolean,
            default: false,
        },
        difficultyRating: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,
        },
        difficultyFeedback: {
            type: String,
            enum: ["Easy", "Normal", "Difficult"],
            default: "Normal",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("FocusSession", focusSessionSchema);
