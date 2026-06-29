const mongoose = require("mongoose");
const User = require("../models/User");
const UserProfile = require("../models/UserProfile");
require("dotenv").config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log("=== USER DATABASE STATUS ===");
        for (const u of users) {
            const profile = await UserProfile.findOne({ userId: u._id });
            const onboardingCompleted = profile ? profile.onboardingCompleted : false;
            console.log(`Name: ${u.name} | Username: ${u.username} | hasSetUsername: ${u.hasSetUsername} | OnboardingCompleted: ${onboardingCompleted}`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkUsers();
