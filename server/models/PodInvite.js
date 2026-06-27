const mongoose = require("mongoose");

const podInviteSchema = new mongoose.Schema(
    {
        podId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pod",
            required: true
        },
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        toUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending"
        },
        sentAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Indexes
podInviteSchema.index({ toUserId: 1, status: 1 });
podInviteSchema.index({ podId: 1, toUserId: 1 }, { unique: true });

module.exports = mongoose.model("PodInvite", podInviteSchema);
