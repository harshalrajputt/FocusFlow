const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
} = require("../controllers/taskController");

// All task routes are protected
router.use(protect);

router.route("/")
    .get(getTasks)
    .post(createTask);

router.route("/:id")
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

module.exports = router;
