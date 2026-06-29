const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const testUpdate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ username: "testuser" });
        if (user) {
            console.log("Before update: hasSetUsername =", user.hasSetUsername);
            user.username = "testuser_updated";
            user.hasSetUsername = true;
            await user.save();
            console.log("After update: hasSetUsername =", user.hasSetUsername);

            const refetched = await User.findById(user._id);
            console.log("Refetched from DB: hasSetUsername =", refetched.hasSetUsername);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

testUpdate();
