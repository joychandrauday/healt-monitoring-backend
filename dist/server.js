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
const service_1 = require("./app/modules/chat/service");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const model_1 = require("./app/modules/user/model");
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Create socket.io instance
exports.io = new socket_io_1.Server(server, {
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
// Store io, onlineUsers, and offlineUsers globally
global.io = exports.io;
const onlineUsers = new Map();
const offlineUsers = new Map();
global.onlineUsers = onlineUsers;
global.offlineUsers = offlineUsers;
// Log Socket.IO initialization
// console.log('Socket.IO initialized:', io ? 'OK' : 'undefined');
const chatService = new service_1.ChatService();
// Initialize offline users from database
const initializeOfflineUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield model_1.UserModel.find().select('_id name role avatar').lean();
        users.forEach((user) => {
            if (!onlineUsers.has(user._id.toString())) {
                offlineUsers.set(user._id.toString(), {
                    role: user.role,
                    name: user.name || 'Unknown',
                    avatar: user.avatar || undefined,
                });
            }
        });
        // console.log('Initialized offline users:', Array.from(offlineUsers.entries()));
    }
    catch (error) {
        console.error('Error initializing offline users:', error);
    }
});
// Authenticate socket connections and populate user data
exports.io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = yield model_1.UserModel.findById(decoded.id).select('name role avatar').lean();
            if (!user) {
                console.error(`User not found for ID: ${decoded.id}`);
                return next(new Error('User not found'));
            }
            socket.data.user = {
                id: decoded.id,
                role: user.role || decoded.role,
                name: user.name || 'Unknown',
                avatar: user.avatar || undefined,
            };
            next();
        }
        catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    }
    else {
        console.error('No token provided for socket authentication');
        next(new Error('Authentication error'));
    }
}));
// Handle socket connections
exports.io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    const role = socket.data.user.role;
    const name = socket.data.user.name;
    const avatar = socket.data.user.avatar;
    // Update user status
    onlineUsers.set(userId, { role, name, avatar });
    offlineUsers.delete(userId); // Remove from offline users
    // console.log(`🟢 New client connected: ${socket.id}, User: ${userId}, Role: ${role}, Name: ${name}, Avatar: ${avatar}, Online users:`, Array.from(onlineUsers.entries()));
    // console.log(`Offline users:`, Array.from(offlineUsers.entries()));
    // Auto-join user to their role-based room
    if (role === 'doctor') {
        socket.join(`doctor:${userId}`);
        // console.log(`Doctor auto-joined room: doctor:${userId}`);
    }
    else if (role === 'patient') {
        socket.join(`patient:${userId}`);
        // console.log(`Patient auto-joined room: patient:${userId}`);
    }
    else if (role === 'admin') {
        socket.join(`admin:${userId}`);
        // console.log(`Admin auto-joined room: admin:${userId}`);
    }
    exports.io.emit('userStatus', {
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
    });
    socket.on('joinDoctorRoom', ({ doctorId }) => {
        if (socket.data.user.id === doctorId && socket.data.user.role === 'doctor') {
            socket.join(`doctor:${doctorId}`);
            // console.log(`Doctor joined room: doctor:${doctorId}`);
            exports.io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        }
        else {
            console.error(`Unauthorized join attempt by ${socket.data.user.id} for doctor:${doctorId}`);
        }
    });
    socket.on('joinPatientRoom', ({ patientId }) => {
        if (socket.data.user.id === patientId && socket.data.user.role === 'patient') {
            socket.join(`patient:${patientId}`);
            // console.log(`Patient joined room: patient:${patientId}`);
            exports.io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        }
    });
    socket.on('joinAdminRoom', ({ adminId }) => {
        if (socket.data.user.id === adminId && socket.data.user.role === 'admin') {
            socket.join(`admin:${adminId}`);
            // console.log(`Admin joined room: admin:${adminId}`);
            exports.io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        }
    });
    socket.on('message', (_a) => __awaiter(void 0, [_a], void 0, function* ({ receiverId, message }) {
        try {
            let savedMessage;
            if (message._id) {
                savedMessage = {
                    _id: message._id,
                    senderId: socket.data.user.id,
                    receiverId,
                    message: message.message,
                    timestamp: message.timestamp || new Date().toISOString(),
                    imageUrls: message.imageUrls || [],
                };
            }
            else {
                savedMessage = yield chatService.saveMessage({
                    senderId: socket.data.user.id,
                    receiverId,
                    message: message.message,
                    timestamp: message.timestamp || new Date().toISOString(),
                    imageUrls: message.imageUrls || [],
                });
                // console.log('Saved message:', savedMessage);
                if (!savedMessage._id) {
                    console.error('Saved message missing _id:', savedMessage);
                    return;
                }
            }
            // Format message for client
            const formattedMessage = {
                _id: savedMessage._id.toString(),
                senderId: {
                    _id: socket.data.user.id,
                    name: socket.data.user.name || 'Unknown',
                    avatar: socket.data.user.avatar,
                },
                receiverId: savedMessage.receiverId.toString(),
                message: savedMessage.message,
                timestamp: new Date(savedMessage.timestamp).toISOString(),
                imageUrls: savedMessage.imageUrls || [],
            };
            exports.io.to(`patient:${socket.data.user.id}`)
                .to(`doctor:${receiverId}`)
                .to(`patient:${receiverId}`)
                .emit('message', formattedMessage);
        }
        catch (error) {
            console.error('Error processing message:', error);
        }
    }));
    // Handle video call initiation
    // Handle video call initiation
    // Handle socket connections
    exports.io.on('connection', (socket) => {
        const userId = socket.data.user.id;
        const role = socket.data.user.role;
        const name = socket.data.user.name;
        const avatar = socket.data.user.avatar;
        // Update user status
        onlineUsers.set(userId, { role, name, avatar });
        offlineUsers.delete(userId);
        console.log(`🟢 New client connected: ${socket.id}, User: ${userId}, Role: ${role}, Name: ${name}`);
        // Auto-join user to their role-based room
        if (role === 'doctor') {
            socket.join(`doctor:${userId}`);
        }
        else if (role === 'patient') {
            socket.join(`patient:${userId}`);
        }
        else if (role === 'admin') {
            socket.join(`admin:${userId}`);
        }
        exports.io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
        // Handle video call initiation
        socket.on('startVideoCall', ({ appointmentId, callerId, recipientId, callerName }) => {
            console.log(`startVideoCall received: ${callerId}, ${recipientId}, ${callerName}, appointmentId: ${appointmentId}`);
            const recipientUser = onlineUsers.get(recipientId);
            const callerUser = onlineUsers.get(callerId);
            if (recipientUser) {
                const recipientRoom = recipientUser.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
                exports.io.to(recipientRoom).emit('receiveVideoCall', {
                    appointmentId,
                    callerId,
                    recipientId,
                    callerName,
                });
                console.log(`Emitted receiveVideoCall to ${recipientRoom}`);
            }
            else {
                socket.emit('callError', { message: 'Recipient is offline' });
                console.log(`Recipient ${recipientId} is offline`);
            }
            // Notify caller that the call is ringing
            if (callerUser) {
                const callerRoom = callerUser.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
                exports.io.to(callerRoom).emit('callRinging', {
                    appointmentId,
                    callerId,
                    recipientId,
                    callerName,
                });
                console.log(`Emitted callRinging to ${callerRoom}`);
            }
        });
        // Handle video call decline
        socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
            console.log(`declineVideoCall received: appointmentId: ${appointmentId}, callerId: ${callerId}, recipientId: ${recipientId}`);
            const callerUser = onlineUsers.get(callerId);
            if (callerUser) {
                const callerRoom = callerUser.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
                exports.io.to(callerRoom).emit('callDeclined', {
                    appointmentId,
                    recipientId,
                });
                console.log(`Emitted callDeclined to ${callerRoom}`);
            }
        });
        // Existing message and disconnect handlers...
    });
    socket.on('logout', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        exports.io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
        socket.disconnect();
    });
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        exports.io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
    });
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, config_1.connectDB)();
        yield initializeOfflineUsers(); // Initialize offline users after DB connection
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
startServer();
exports.default = server;
