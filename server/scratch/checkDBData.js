const mongoose = require("mongoose");
require("dotenv").config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("=== COLLECTIONS ===");
        collections.forEach(c => console.log(c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
