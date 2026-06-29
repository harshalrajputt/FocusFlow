const mongoose = require("mongoose");

const podSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        leaderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        streak: {
            type: Number,
            default: 0
        },
        lastActiveDate: {
            type: String,
            default: ""
        },
        members: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                joinedAt: {
                    type: Date,
                    default: Date.now
                },
                role: {
                    type: String,
                    enum: ["leader", "member"],
                    default: "member"
                }
            }
        ],
        challenges: [
            {
                title: {
                    type: String,
                    required: true
                },
                targetXP: {
                    type: Number,
                    required: true
                },
                progress: {
                    type: Map,
                    of: Number,
                    default: {}
                },
                status: {
                    type: String,
                    enum: ["active", "completed"],
                    default: "active"
                },
                endDate: {
                    type: Date,
                    required: true
                }
            }
        ],

        // Pod Health Bar
        healthScore: {
            type: Number,
            default: 100,
            min: 0,
            max: 100
        },
        lastHealthDecay: {
            type: Date,
            default: Date.now
        },

        // Badges won from rival battles
        badges: [
            {
                type: { type: String },
                earnedAt: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Indexes for query performance
podSchema.index({ "members.userId": 1 });

module.exports = mongoose.model("Pod", podSchema);
