const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        basic: {
            nickname: { type: String, default: "" },
            academicLevel: {
                type: String,
                enum: [
                    "5th Standard",
                    "6th Standard",
                    "7th Standard",
                    "8th Standard",
                    "9th Standard",
                    "10th Standard",
                    "11th Standard",
                    "12th Standard",
                    "Undergraduate",
                    "Postgraduate",
                    "Other"
                ],
                default: "Undergraduate"
            },
            institutionName: { type: String, default: "" },
            streamOrBranch: { type: String, default: "" },
            preferredLanguage: { type: String, default: "English" }
        },
        schedule: {
            wakeUpTime: { type: String, default: "06:00" },
            sleepTime: { type: String, default: "22:00" },
            classTimings: {
                start: { type: String, default: "08:00" },
                end: { type: String, default: "14:00" }
            },
            coachingTimings: {
                start: { type: String, default: "16:00" },
                end: { type: String, default: "18:00" }
            },
            commuteDuration: { type: Number, default: 0 } // in minutes
        },
        productivity: {
            mostProductiveHours: {
                type: String,
                enum: ["Morning", "Afternoon", "Evening", "Night"],
                default: "Morning"
            },
            leastProductiveHours: {
                type: String,
                enum: ["Morning", "Afternoon", "Evening", "Night"],
                default: "Afternoon"
            },
            energyLevels: {
                morning: { type: Number, min: 1, max: 10, default: 5 },
                afternoon: { type: Number, min: 1, max: 10, default: 5 },
                evening: { type: Number, min: 1, max: 10, default: 5 },
                night: { type: Number, min: 1, max: 10, default: 5 }
            }
        },
        focus: {
            preferredSessionDuration: { type: Number, default: 25 },
            studyEnvironment: { type: String, default: "Quiet Room" },
            biggestDistractions: { type: [String], default: [] },
            breakPreference: { type: String, default: "Short Walk" }
        },
        goals: {
            academicGoals: { type: [String], default: [] },
            skillsToLearn: { type: [String], default: [] },
            studyStyle: { type: String, default: "Pomodoro Technique" }
        },
        customDetails: {
            type: { type: String, default: "" },
            description: { type: String, default: "" }
        },
        onboardingCompleted: { type: Boolean, default: false },
        onboardingStep: { type: Number, default: 1 }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
