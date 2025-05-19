"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const config_1 = require("./app/config");
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Create socket.io instance
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'https://your-frontend-domain.com',
            'wss://health-monitoring-backend-0rmy.onrender.com'
        ],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'], // Explicitly support both transports
});
// Handle socket connections
exports.io.on('connection', (socket) => {
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
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, config_1.connectDB)();
        // Check if server is already listening
        if (!server.listening) {
            server.listen(PORT, () => {
                console.log(`🚀 Health Monitoring Server running on port ${PORT}`);
                console.log(`Socket.io server running on http://localhost:${PORT}`);
            });
        }
        else {
            console.log(`Server is already listening on port ${PORT}`);
        }
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});
// Start the server
startServer();
// Export the server as default
exports.default = server;
