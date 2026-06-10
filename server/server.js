require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const focusRoutes = require("./routes/focusRoutes");
const goalRoutes = require("./routes/goalRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const websiteUsageRoutes = require("./routes/websiteUsageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

connectDB();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.send("FocusFlow API Running");
});

app.get("/api/download-extension", (req, res) => {
    const filePath = path.join(__dirname, "extension.zip");
    res.download(filePath, "focusflow-companion.zip");
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/website-usage", websiteUsageRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});