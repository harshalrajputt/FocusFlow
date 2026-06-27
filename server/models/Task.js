const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },

        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },

        priority: {
            type: String,
            enum: ["Critical", "High", "Medium", "Low"],
            default: "Medium",
        },

        skipCost: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium",
        },

        flexibility: {
            type: String,
            enum: ["Fixed", "SemiFlexible", "Flexible"],
            default: "Flexible",
        },

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
        },

        dueDate: {
            type: Date,
            default: null,
        },

        shareWithPod: {
            type: Boolean,
            default: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Task", taskSchema);
