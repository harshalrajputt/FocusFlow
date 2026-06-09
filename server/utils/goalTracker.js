const Goal = require("../models/Goal");

/**
 * Automatically increments active goals for a user based on a specific metric.
 * An active goal is one where the current date is between startDate and endDate.
 * 
 * @param {string} userId - The ID of the user.
 * @param {string} metric - The metric type ('FocusMinutes', 'TasksCompleted', 'FocusSessions').
 * @param {number} increment - The value to add to the progress.
 */
const trackGoalProgress = async (userId, metric, increment) => {
    try {
        const now = new Date();

        // Find active goals for this user and metric
        const activeGoals = await Goal.find({
            userId,
            metric,
            startDate: { $lte: now },
            endDate: { $gte: now },
        });

        for (let goal of activeGoals) {
            goal.currentValue = (goal.currentValue || 0) + increment;
            
            if (goal.currentValue >= goal.targetValue) {
                goal.completed = true;
            } else {
                goal.completed = false;
            }

            await goal.save();
        }
    } catch (error) {
        console.error(`Error updating goal progress for user ${userId}, metric ${metric}:`, error.message);
    }
};

module.exports = {
    trackGoalProgress,
};
