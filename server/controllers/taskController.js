const Task = require("../models/Task");

// ─── GET all tasks for the logged-in user ───────────────────────────────────
const getTasks = async (req, res) => {
    try {
        const { status, priority, sort } = req.query;

        const filter = { userId: req.user.id };

        if (status)   filter.status   = status;
        if (priority) filter.priority = priority;

        const sortOrder = sort === "oldest"
            ? { createdAt: 1 }
            : sort === "dueDate"
            ? { dueDate: 1 }
            : { createdAt: -1 }; // newest first (default)

        const tasks = await Task.find(filter).sort(sortOrder);

        res.status(200).json({
            success: true,
            count: tasks.length,
            tasks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching tasks",
            error: error.message,
        });
    }
};

// ─── GET single task ─────────────────────────────────────────────────────────
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

// ─── CREATE task ─────────────────────────────────────────────────────────────
const createTask = async (req, res) => {
    try {
        const { title, description, priority, status, dueDate, skipCost, flexibility } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Task title is required",
            });
        }

        const task = await Task.create({
            title:       title.trim(),
            description: description?.trim() || "",
            priority:    priority  || "Medium",
            status:      status    || "Pending",
            dueDate:     dueDate   || null,
            skipCost:    skipCost  || "Medium",
            flexibility: flexibility || "Flexible",
            userId:      req.user.id,
        });

        // Trigger goals update if task is completed upon creation
        if (task.status === "Completed") {
            const { trackGoalProgress } = require("../utils/goalTracker");
            await trackGoalProgress(req.user.id, "TasksCompleted", 1);
        }

        res.status(201).json({ success: true, task });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while creating task",
            error: error.message,
        });
    }
};

// ─── UPDATE task ─────────────────────────────────────────────────────────────
const updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        const { title, description, priority, status, dueDate, skipCost, flexibility } = req.body;

        const wasCompletedBefore = task.status === "Completed";

        if (title !== undefined)       task.title       = title.trim();
        if (description !== undefined) task.description = description.trim();
        if (priority !== undefined)    task.priority    = priority;
        if (status !== undefined)      task.status      = status;
        if (dueDate !== undefined)     task.dueDate     = dueDate || null;
        if (skipCost !== undefined)    task.skipCost    = skipCost;
        if (flexibility !== undefined) task.flexibility = flexibility;

        await task.save();

        const isCompletedNow = task.status === "Completed";

        // Auto-increment goal progress if transitioning to Completed, decrement if transitioning away
        if (isCompletedNow && !wasCompletedBefore) {
            const { trackGoalProgress } = require("../utils/goalTracker");
            await trackGoalProgress(req.user.id, "TasksCompleted", 1);
        } else if (!isCompletedNow && wasCompletedBefore) {
            const { trackGoalProgress } = require("../utils/goalTracker");
            await trackGoalProgress(req.user.id, "TasksCompleted", -1);
        }

        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while updating task",
            error: error.message,
        });
    }
};

// ─── DELETE task ─────────────────────────────────────────────────────────────
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Task deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while deleting task",
            error: error.message,
        });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
};
