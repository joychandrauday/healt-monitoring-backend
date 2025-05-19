import { Server, Socket } from "socket.io";

export const registerSocketEvents = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log("User connected with socket:", socket.id);
        socket.on("user:connect", (userId: string) => {
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
