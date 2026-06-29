const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ username: "prathmeshkulkarni" });
        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }

        console.log("User before update:", { username: user.username, hasSetUsername: user.hasSetUsername });

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Send API request to local server using built-in fetch
        const response = await fetch("http://localhost:5000/api/auth/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ username: "prathmeshkulkarni" })
        });

        const data = await response.json();
        console.log("API Response Status:", response.status);
        console.log("API Response Data:", JSON.stringify(data, null, 2));

        // Refetch user from DB
        const updatedUser = await User.findById(user._id);
        console.log("User after update in DB:", { username: updatedUser.username, hasSetUsername: updatedUser.hasSetUsername });

        process.exit(0);
    } catch (e) {
        console.error("API Error:", e.message);
        process.exit(1);
    }
};

runTest();
