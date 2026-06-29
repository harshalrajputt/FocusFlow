const mongoose = require("mongoose");
const { getWeeklyReport, getActiveSprint } = require("../controllers/podController");
require("dotenv").config();

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Mock request for getWeeklyReport
        const req = {
            user: { id: "6a40f7993cefda9b2263e76f" }, // HARSHAL RAJPUT
            params: { podId: "6a42a72a3d681b71a63ab457" } // codex
        };

        const res = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log("=== getWeeklyReport RESPONSE ===");
                console.log("Status Code:", this.statusCode);
                console.log("JSON Data:", JSON.stringify(data, null, 2));
            }
        };

        await getWeeklyReport(req, res);

        // Test getActiveSprint
        const reqSprint = {
            user: { id: "6a40f7993cefda9b2263e76f" },
            params: { podId: "6a42a72a3d681b71a63ab457" }
        };

        const resSprint = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log("\n=== getActiveSprint RESPONSE ===");
                console.log("Status Code:", this.statusCode);
                console.log("JSON Data:", JSON.stringify(data, null, 2));
            }
        };

        await getActiveSprint(reqSprint, resSprint);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

runTest();
