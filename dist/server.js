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
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
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
global.io = exports.io;
const onlineUsers = new Map();
const offlineUsers = new Map();
global.onlineUsers = onlineUsers;
global.offlineUsers = offlineUsers;
const chatService = new service_1.ChatService();
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
        console.log('Initialized offline users:', Array.from(offlineUsers.entries()));
    }
    catch (error) {
        console.error('Error initializing offline users:', error);
    }
});
exports.io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = yield model_1.UserModel.findById(decoded.id).select('name role avatar').lean();
            if (!user)
                return next(new Error('User not found'));
            socket.data.user = {
                id: decoded.id,
                role: user.role || decoded.role,
                name: user.name || 'Unknown',
                avatar: user.avatar || undefined,
            };
            next();
        }
        catch (error) {
            next(new Error('Authentication error'));
        }
    }
    else {
        next(new Error('Authentication error'));
    }
}));
exports.io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    const role = socket.data.user.role;
    const name = socket.data.user.name;
    const avatar = socket.data.user.avatar;
    onlineUsers.set(userId, { role, name, avatar });
    offlineUsers.delete(userId);
    console.log(`🟢 Client connected: ${socket.id}, User: ${userId}`);
    if (role === 'doctor')
        socket.join(`doctor:${userId}`);
    else if (role === 'patient')
        socket.join(`patient:${userId}`);
    else if (role === 'admin')
        socket.join(`admin:${userId}`);
    exports.io.emit('userStatus', {
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
        offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
    });
    socket.on('joinDoctorRoom', ({ doctorId }) => {
        if (socket.data.user.id === doctorId && role === 'doctor') {
            socket.join(`doctor:${doctorId}`);
        }
    });
    socket.on('joinPatientRoom', ({ patientId }) => {
        if (socket.data.user.id === patientId && role === 'patient') {
            socket.join(`patient:${patientId}`);
        }
    });
    socket.on('joinAdminRoom', ({ adminId }) => {
        if (socket.data.user.id === adminId && role === 'admin') {
            socket.join(`admin:${adminId}`);
        }
    });
    socket.on('message', (_a) => __awaiter(void 0, [_a], void 0, function* ({ receiverId, message }) {
        try {
            let savedMessage;
            if (message._id) {
                savedMessage = Object.assign(Object.assign({}, message), { senderId: userId, receiverId, timestamp: message.timestamp || new Date().toISOString() });
            }
            else {
                savedMessage = yield chatService.saveMessage({
                    senderId: userId,
                    receiverId,
                    message: message.message,
                    timestamp: message.timestamp || new Date().toISOString(),
                    imageUrls: message.imageUrls || [],
                });
            }
            const formattedMessage = {
                _id: savedMessage._id.toString(),
                senderId: {
                    _id: userId,
                    name,
                    avatar,
                },
                receiverId: savedMessage.receiverId.toString(),
                message: savedMessage.message,
                timestamp: new Date(savedMessage.timestamp).toISOString(),
                imageUrls: savedMessage.imageUrls || [],
            };
            exports.io.to(`patient:${userId}`)
                .to(`doctor:${receiverId}`)
                .to(`patient:${receiverId}`)
                .emit('message', formattedMessage);
        }
        catch (error) {
            console.error('Message error:', error);
        }
    }));
    socket.on('startVideoCall', ({ appointmentId, callerId, recipientId, callerName }) => {
        const recipientUser = onlineUsers.get(recipientId);
        const callerUser = onlineUsers.get(callerId);
        if (recipientUser) {
            exports.io.to(`${recipientUser.role}:${recipientId}`).emit('startVideoCall', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
        }
        else {
            socket.emit('callError', { message: 'Recipient is offline', appointmentId });
        }
        if (callerUser) {
            exports.io.to(`${callerUser.role}:${callerId}`).emit('callRinging', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
        }
    });
    socket.on('signal', ({ appointmentId, callerId, receiverId, signalData }) => {
        const recipientUser = onlineUsers.get(receiverId);
        if (recipientUser) {
            exports.io.to(`${recipientUser.role}:${receiverId}`).emit('signal', {
                appointmentId,
                callerId,
                receiverId,
                signalData,
            });
        }
    });
    socket.on('callAccepted', ({ appointmentId, callerId, recipientId }) => {
        const callerUser = onlineUsers.get(callerId);
        if (callerUser) {
            exports.io.to(`${callerUser.role}:${callerId}`).emit('callAccepted', {
                appointmentId,
                callerId,
                recipientId,
            });
        }
    });
    socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
        const callerUser = onlineUsers.get(callerId);
        if (callerUser) {
            exports.io.to(`${callerUser.role}:${callerId}`).emit('callDeclined', {
                appointmentId,
                recipientId,
            });
        }
    });
    socket.on('hangUp', ({ appointmentId, callerId, recipientId }) => {
        const recipientUser = onlineUsers.get(recipientId);
        if (recipientUser) {
            exports.io.to(`${recipientUser.role}:${recipientId}`).emit('hangUp', { appointmentId });
        }
    });
    socket.on('logout', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        exports.io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
        });
        socket.disconnect();
    });
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        console.log(`🔴 Client disconnected: ${userId}`);
        exports.io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => (Object.assign({ id }, val))),
        });
    });
});
// Connect to DB and start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, config_1.connectDB)();
        yield initializeOfflineUsers();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Server failed to start:', error);
    }
});
startServer();
