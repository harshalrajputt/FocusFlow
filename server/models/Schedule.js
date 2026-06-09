const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["sleep", "class", "coaching", "commute", "study", "break", "leisure", "other"],
        required: true
    },
    startTime: {
        type: String, // format "HH:MM"
        required: true
    },
    endTime: {
        type: String, // format "HH:MM"
        required: true
    },
    associatedGoal: {
        type: String,
        default: ""
    }
});

const dayScheduleSchema = new mongoose.Schema({
    dayName: {
        type: String,
        required: true,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    },
    events: [eventSchema]
});

const scheduleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        days: [dayScheduleSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
