/**
 * socketHandler.js
 * Manages Socket.io connections and real-time events for FocusFlow.
 *
 * Rooms:
 *   pod:<podId>   — all members of a pod join this room
 *
 * Events emitted by server:
 *   presence:update     — a member started/stopped a session
 *   session:reaction    — a member reacted to an activity
 *   sprint:update       — sprint room state changed
 *   pod:health:update   — pod health bar value changed
 *   rivalry:update      — rival XP scores updated
 */

const jwt = require("jsonwebtoken");
const Pod = require("../models/Pod");

// userId -> socketId map (for targeted messaging)
const userSocketMap = new Map();

const initSocket = (io) => {
    // Authenticate socket connections using JWT from handshake
    io.use((socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.query?.token;

        if (!token) {
            return next(new Error("Authentication error: no token"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id || decoded.userId;
            next();
        } catch (err) {
            next(new Error("Authentication error: invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.userId;
        userSocketMap.set(userId, socket.id);

        // Join all pod rooms this user belongs to
        try {
            const pods = await Pod.find({ "members.userId": userId }).select("_id");
            pods.forEach((pod) => {
                socket.join(`pod:${pod._id}`);
            });
        } catch (err) {
            console.error("Socket: failed to join pod rooms", err.message);
        }

        // Client explicitly joins a pod room (e.g., after accepting an invite)
        socket.on("join:pod", (podId) => {
            socket.join(`pod:${podId}`);
        });

        // Client explicitly leaves a pod room (e.g., after leaving a pod)
        socket.on("leave:pod", (podId) => {
            socket.leave(`pod:${podId}`);
        });

        socket.on("disconnect", () => {
            userSocketMap.delete(userId);
        });
    });
};

/**
 * Broadcast an event to every socket in a pod room except the sender.
 * @param {object} io - Socket.io server instance
 * @param {string} podId - Pod ID
 * @param {string} event - Event name
 * @param {object} data - Payload
 * @param {string} [excludeUserId] - Optionally exclude this userId from broadcast
 */
const emitToPod = (io, podId, event, data, excludeUserId = null) => {
    const room = `pod:${podId}`;
    if (excludeUserId) {
        const excludedSocketId = userSocketMap.get(excludeUserId);
        if (excludedSocketId) {
            io.to(room).except(excludedSocketId).emit(event, data);
        } else {
            io.to(room).emit(event, data);
        }
    } else {
        io.to(room).emit(event, data);
    }
};

/**
 * Emit an event to a specific user by userId.
 * @param {object} io - Socket.io server instance
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {object} data - Payload
 */
const emitToUser = (io, userId, event, data) => {
    const socketId = userSocketMap.get(userId.toString());
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
};

module.exports = { initSocket, emitToPod, emitToUser, userSocketMap };
