const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: [true, "Goal title is required"],
            trim: true,
            maxlength: [200, "Goal title cannot exceed 200 characters"],
        },
        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        goalType: {
            type: String,
            enum: ["Daily", "Weekly", "Monthly"],
            required: [true, "Goal type (Daily/Weekly/Monthly) is required"],
        },
        metric: {
            type: String,
            enum: ["FocusMinutes", "TasksCompleted", "FocusSessions"],
            required: [true, "Goal metric is required"],
        },
        targetValue: {
            type: Number,
            required: [true, "Goal target value is required"],
            min: [1, "Target value must be at least 1"],
        },
        currentValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Goal", goalSchema);
