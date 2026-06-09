const Goal = require("../models/Goal");

// ─── CREATE goal ─────────────────────────────────────────────────────────────
const createGoal = async (req, res) => {
    try {
        const { title, description, goalType, metric, targetValue } = req.body;

        if (!title || !goalType || !metric || !targetValue) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (title, goalType, metric, targetValue)",
            });
        }

        // Calculate startDate and endDate automatically
        let startDate = new Date();
        let endDate = new Date();

        if (goalType === "Daily") {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (goalType === "Weekly") {
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (goalType === "Monthly") {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid goalType. Must be 'Daily', 'Weekly', or 'Monthly'",
            });
        }

        // Scan database to retroactively load progress for tasks/timers completed earlier in the current period
        let currentValue = 0;
        if (metric === "TasksCompleted") {
            const Task = require("../models/Task");
            currentValue = await Task.countDocuments({
                userId: req.user.id,
                status: "Completed",
                updatedAt: { $gte: startDate, $lte: endDate },
            });
        } else if (metric === "FocusSessions") {
            const FocusSessionModel = require("../models/FocusSession");
            currentValue = await FocusSessionModel.countDocuments({
                userId: req.user.id,
                sessionType: "Focus",
                completed: true,
                startTime: { $gte: startDate, $lte: endDate },
            });
        } else if (metric === "FocusMinutes") {
            const FocusSessionModel = require("../models/FocusSession");
            const sessions = await FocusSessionModel.find({
                userId: req.user.id,
                sessionType: "Focus",
                completed: true,
                startTime: { $gte: startDate, $lte: endDate },
            });
            const totalSeconds = sessions.reduce((sum, s) => sum + s.duration, 0);
            currentValue = Math.round(totalSeconds / 60);
        }

        const completed = currentValue >= targetValue;

        const goal = await Goal.create({
            userId: req.user.id,
            title: title.trim(),
            description: description?.trim() || "",
            goalType,
            metric,
            targetValue,
            currentValue,
            startDate,
            endDate,
            completed,
        });

        res.status(201).json({
            success: true,
            goal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while creating goal",
            error: error.message,
        });
    }
};

// ─── GET goals ───────────────────────────────────────────────────────────────
const getGoals = async (req, res) => {
    try {
        const { active, goalType } = req.query;
        const filter = { userId: req.user.id };

        if (goalType) {
            filter.goalType = goalType;
        }

        if (active === "true") {
            const now = new Date();
            filter.startDate = { $lte: now };
            filter.endDate = { $gte: now };
        }

        // Return sorted: active goals/recent goals first
        const goals = await Goal.find(filter).sort({ endDate: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: goals.length,
            goals,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while fetching goals",
            error: error.message,
        });
    }
};

// ─── UPDATE goal ─────────────────────────────────────────────────────────────
const updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findOne({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: "Goal not found",
            });
        }

        const { title, description, targetValue, currentValue, completed } = req.body;

        if (title !== undefined)       goal.title = title.trim();
        if (description !== undefined) goal.description = description.trim();
        if (targetValue !== undefined) goal.targetValue = targetValue;
        if (currentValue !== undefined) {
            goal.currentValue = currentValue;
            goal.completed = goal.currentValue >= goal.targetValue;
        }
        if (completed !== undefined && currentValue === undefined) {
            goal.completed = completed;
        }

        await goal.save();

        res.status(200).json({
            success: true,
            goal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while updating goal",
            error: error.message,
        });
    }
};

// ─── DELETE goal ─────────────────────────────────────────────────────────────
const deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: "Goal not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Goal deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while deleting goal",
            error: error.message,
        });
    }
};

module.exports = {
    createGoal,
    getGoals,
    updateGoal,
    deleteGoal,
};
