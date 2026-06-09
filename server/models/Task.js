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
            enum: ["Low", "Medium", "High"],
            default: "Medium",
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
