const mongoose = require("mongoose");

const podRivalrySchema = new mongoose.Schema(
    {
        challengerPodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            required: true
        },
        challengedPodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "active", "completed", "declined"],
            default: "pending"
        },
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        },
        challengerXP: {
            type: Number,
            default: 0
        },
        challengedXP: {
            type: Number,
            default: 0
        },
        winnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            default: null
        }
    },
    {
        timestamps: true
    }
);

podRivalrySchema.index({ challengerPodId: 1, status: 1 });
podRivalrySchema.index({ challengedPodId: 1, status: 1 });

module.exports = mongoose.model("PodRivalry", podRivalrySchema);
