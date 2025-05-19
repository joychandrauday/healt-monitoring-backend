"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketEvents = void 0;
const registerSocketEvents = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected with socket:", socket.id);
        socket.on("user:connect", (userId) => {
            // Add this user to a specific room by ID
            socket.join(`user:${userId}`);
            console.log(`User ${userId} joined room user:${userId}`);
        });
        // Optional: disconnect log
        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
        });
    });
};
exports.registerSocketEvents = registerSocketEvents;
