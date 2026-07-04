const mongoose = require("mongoose");
const User = require("../models/User");

const runUsernameMigration = async () => {
    try {
        const usersWithoutUsername = await User.find({
            $or: [
                { username: { $exists: false } },
                { username: null },
                { username: "" }
            ]
        });
        
        if (usersWithoutUsername.length > 0) {
            console.log(`Running username migration for ${usersWithoutUsername.length} users...`);
            for (const user of usersWithoutUsername) {
                let baseUsername = "";
                if (user.name) {
                    baseUsername = user.name.toLowerCase().replace(/[^a-z0-9_]/g, "");
                }
                if (!baseUsername && user.email) {
                    baseUsername = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
                }
                if (!baseUsername) {
                    baseUsername = "user";
                }
                
                if (baseUsername.length < 3) {
                    baseUsername = baseUsername + "_usr";
                }
                
                let uniqueUsername = baseUsername;
                let isUnique = false;
                let suffix = 1;
                
                while (!isUnique) {
                    const existing = await User.findOne({ username: uniqueUsername });
                    if (!existing) {
                        isUnique = true;
                    } else {
                        uniqueUsername = `${baseUsername}${suffix}`;
                        suffix++;
                    }
                }
                
                user.username = uniqueUsername;
                user.hasSetUsername = false;
                await user.save();
                console.log(`Assigned temporary username "${uniqueUsername}" to user "${user.name}"`);
            }
            console.log("Username migration completed successfully.");
        }
    } catch (err) {
        console.error("Error running username migration:", err);
    }
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");

        // Drop old unique indexes to allow category-based indexing
        try {
            await mongoose.connection.db.collection("websiteusages").dropIndex("userId_1_date_1_domain_1");
            console.log("Successfully dropped index userId_1_date_1_domain_1");
        } catch (e) {
            // Index might not exist, which is fine
        }
        try {
            await mongoose.connection.db.collection("weeklywebsiteusages").dropIndex("userId_1_weekStartDate_1_domain_1");
            console.log("Successfully dropped index userId_1_weekStartDate_1_domain_1");
        } catch (e) {
            // Index might not exist, which is fine
        }
        try {
            await mongoose.connection.db.collection("monthlywebsiteusages").dropIndex("userId_1_monthStartDate_1_domain_1");
            console.log("Successfully dropped index userId_1_monthStartDate_1_domain_1");
        } catch (e) {
            // Index might not exist, which is fine
        }

        await runUsernameMigration();
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
};

module.exports = connectDB;