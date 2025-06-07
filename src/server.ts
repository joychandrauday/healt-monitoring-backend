import http from 'http';
import { Server, Socket } from 'socket.io';
import app from './app';
import { connectDB } from './app/config';
import { ChatService } from './app/modules/chat/service';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongoose';
import { UserModel } from './app/modules/user/model';

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

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

(global as any).io = io;
const onlineUsers = new Map<string, { role: string; name: string; avatar?: string }>();
const offlineUsers = new Map<string, { role: string; name: string; avatar?: string }>();
(global as any).onlineUsers = onlineUsers;
(global as any).offlineUsers = offlineUsers;

const chatService = new ChatService();

const initializeOfflineUsers = async () => {
    try {
        const users = await UserModel.find().select('_id name role avatar').lean();
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
    } catch (error) {
        console.error('Error initializing offline users:', error);
    }
};

io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                id: string;
                role: string;
                name?: string;
                avatar?: string;
            };
            const user = await UserModel.findById(decoded.id).select('name role avatar').lean();
            if (!user) return next(new Error('User not found'));
            socket.data.user = {
                id: decoded.id,
                role: user.role || decoded.role,
                name: user.name || 'Unknown',
                avatar: user.avatar || undefined,
            };
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    } else {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.id;
    const role = socket.data.user.role;
    const name = socket.data.user.name;
    const avatar = socket.data.user.avatar;

    onlineUsers.set(userId, { role, name, avatar });
    offlineUsers.delete(userId);
    console.log(`🟢 Client connected: ${socket.id}, User: ${userId}`);

    if (role === 'doctor') socket.join(`doctor:${userId}`);
    else if (role === 'patient') socket.join(`patient:${userId}`);
    else if (role === 'admin') socket.join(`admin:${userId}`);

    io.emit('userStatus', {
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
        offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
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

    socket.on('message', async ({ receiverId, message }) => {
        try {
            let savedMessage;
            if (message._id) {
                savedMessage = {
                    ...message,
                    senderId: userId,
                    receiverId,
                    timestamp: message.timestamp || new Date().toISOString(),
                };
            } else {
                savedMessage = await chatService.saveMessage({
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

            io.to(`patient:${userId}`)
                .to(`doctor:${receiverId}`)
                .to(`patient:${receiverId}`)
                .emit('message', formattedMessage);
        } catch (error) {
            console.error('Message error:', error);
        }
    });

    socket.on('startVideoCall', ({ appointmentId, callerId, recipientId, callerName }) => {
        const recipientUser = onlineUsers.get(recipientId);
        const callerUser = onlineUsers.get(callerId);

        if (recipientUser) {
            io.to(`${recipientUser.role}:${recipientId}`).emit('startVideoCall', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
        } else {
            socket.emit('callError', { message: 'Recipient is offline', appointmentId });
        }

        if (callerUser) {
            io.to(`${callerUser.role}:${callerId}`).emit('callRinging', {
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
            io.to(`${recipientUser.role}:${receiverId}`).emit('signal', {
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
            io.to(`${callerUser.role}:${callerId}`).emit('callAccepted', {
                appointmentId,
                callerId,
                recipientId,
            });
        }
    });

    socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
        const callerUser = onlineUsers.get(callerId);
        if (callerUser) {
            io.to(`${callerUser.role}:${callerId}`).emit('callDeclined', {
                appointmentId,
                recipientId,
            });
        }
    });

    socket.on('hangUp', ({ appointmentId, callerId, recipientId }) => {
        const recipientUser = onlineUsers.get(recipientId);
        if (recipientUser) {
            io.to(`${recipientUser.role}:${recipientId}`).emit('hangUp', { appointmentId });
        }
    });

    socket.on('logout', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
        });
        socket.disconnect();
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        console.log(`🔴 Client disconnected: ${userId}`);
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, val]) => ({ id, ...val })),
        });
    });
});

// Connect to DB and start server
const startServer = async () => {
    try {
        await connectDB();
        await initializeOfflineUsers();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Server failed to start:', error);
    }
};

startServer();
