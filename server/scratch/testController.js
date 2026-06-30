const mongoose = require("mongoose");
const { getInsights } = require("../controllers/analyticsController");
require("dotenv").config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Mock request for getInsights
        const req = {
            user: { id: "6a40f7993cefda9b2263e76f" } // HARSHAL RAJPUT
        };

        const res = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log("=== getInsights RESPONSE ===");
                console.log("Status Code:", this.statusCode);
                console.log("Stats:", data.stats);
                console.log("ProfileAnalysis:", data.profileAnalysis);
                console.log("Recommendations count:", data.recommendations?.length);
                console.log("Using ML Predictions?:", data.mlPredictions !== null);
            }
        };

        await getInsights(req, res);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runTest();
