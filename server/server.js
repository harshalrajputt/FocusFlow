require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { initSocket } = require("./socket/socketHandler");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const focusRoutes = require("./routes/focusRoutes");
const goalRoutes = require("./routes/goalRoutes");
const userProfileRoutes = require("./routes/userProfileRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const websiteUsageRoutes = require("./routes/websiteUsageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const podRoutes = require("./routes/podRoutes");

const app = express();
const httpServer = http.createServer(app);

// Socket.io attached to the same HTTP server
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make `io` accessible to route controllers via req.io
app.use((req, _res, next) => {
    req.io = io;
    next();
});

// Initialise socket rooms and event listeners
initSocket(io);

connectDB();

app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
app.use("/api/pods", podRoutes);

// Register cron jobs
require("./jobs/podHealthJob")(io);
require("./jobs/weeklyReportJob")(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (with Socket.io)`);
});