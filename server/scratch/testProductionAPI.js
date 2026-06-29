const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ username: "harshalrajput" });
        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }

        const token = jwt.sign(
            { id: user._id, userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log("Testing GET /api/pods/6a42a72a3d681b71a63ab457 on live server...");
        const res = await fetch("https://focusflow-backend-liuf.onrender.com/api/pods/6a42a72a3d681b71a63ab457", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data keys:", Object.keys(data));
        console.log("activeSprint in response:", data.activeSprint);
        console.log("activeRivalry in response:", data.activeRivalry);

        process.exit(0);
    } catch (e) {
        console.error("Connection Error:", e.message);
        process.exit(1);
    }
};

runTest();
