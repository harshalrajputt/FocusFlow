const mongoose = require("mongoose");

const scheduledSessionLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true
        },
        eventTitle: {
            type: String,
            required: true
        },
        startTime: {
            type: String, // "HH:MM"
            required: true
        },
        endTime: {
            type: String, // "HH:MM"
            required: true
        },
        status: {
            type: String,
            enum: ["Completed", "Partially Completed", "Skipped", "Postponed", "Extended", "Not Completed", "Missed Session"],
            default: "Not Completed"
        },
        importance: {
            type: String,
            enum: ["Critical", "Important", "Optional", "Cancel", null],
            default: null
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Index to ensure efficient daily lookups
scheduledSessionLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model("ScheduledSessionLog", scheduledSessionLogSchema);
