import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDB } from './app/config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Create socket.io instance
export const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'https://health-monitoring-system-five.vercel.app',
            'wss://health-monitoring-backend-0rmy.onrender.com',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Store io globally
(global as any).io = io;

// Log Socket.IO initialization
console.log('Socket.IO initialized:', io ? 'OK' : 'undefined');

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`🟢 New client connected: ${socket.id}`);

    socket.on('joinDoctorRoom', ({ doctorId }) => {
        socket.join(`doctor:${doctorId}`);
        console.log(`Doctor joined room: doctor:${doctorId}`);
    });

    socket.on('joinPatientRoom', ({ patientId }) => {
        socket.join(`patient:${patientId}`);
        console.log(`Patient joined room: patient:${patientId}`);
    });

    socket.on('joinAdminRoom', ({ adminId }) => {
        socket.join(`admin:${adminId}`);
        console.log(`Admin joined room: admin:${adminId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);
    });
});

const startServer = async () => {
    try {
        await connectDB();
        // Check if server is already listening
        if (!server.listening) {
            server.listen(PORT, () => {
                console.log(`🚀 Health Monitoring Server running on port ${PORT}`);
                console.log(`Socket.io server running on http://localhost:${PORT}`);
            });
        } else {
            console.log(`Server is already listening on port ${PORT}`);
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

// Export the server as default
export default server;