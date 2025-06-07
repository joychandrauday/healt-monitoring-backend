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
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    } else {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket: Socket) => {
    const { id: userId, role, name, avatar } = socket.data.user;

    onlineUsers.set(userId, { role, name, avatar });
    offlineUsers.delete(userId);

    console.log(`🟢 Connected: ${socket.id}, User: ${userId}, Role: ${role}, Name: ${name}`);

    socket.join(`${role}:${userId}`);
    console.log(`${role} joined room: ${role}:${userId}`);

    io.emit('userStatus', {
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
    });

    socket.on('joinDoctorRoom', ({ doctorId }: { doctorId: string }) => {
        if (userId === doctorId && role === 'doctor') {
            socket.join(`doctor:${doctorId}`);
        }
    });

    socket.on('joinPatientRoom', ({ patientId }: { patientId: string }) => {
        if (userId === patientId && role === 'patient') {
            socket.join(`patient:${patientId}`);
        }
    });

    socket.on('joinAdminRoom', ({ adminId }: { adminId: string }) => {
        if (userId === adminId && role === 'admin') {
            socket.join(`admin:${adminId}`);
        }
    });

    socket.on('message', async ({ receiverId, message }: { receiverId: ObjectId; message: any }) => {
        try {
            let savedMessage: any;
            if (message._id) {
                savedMessage = {
                    _id: message._id,
                    senderId: userId,
                    receiverId,
                    message: message.message,
                    timestamp: message.timestamp || new Date().toISOString(),
                    imageUrls: message.imageUrls || [],
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
                _id: savedMessage._id,
                senderId: { id: userId, name, avatar },
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
            console.error('Error processing message:', error);
        }
    });

    socket.on('startVideoCall', ({ appointmentId, callerId, recipientId, callerName }) => {
        const recipient = onlineUsers.get(recipientId);
        const caller = onlineUsers.get(callerId);

        if (recipient) {
            const room = recipient.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
            io.to(room).emit('startVideoCall', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
        } else {
            socket.emit('callError', { message: 'Recipient is offline', appointmentId });
        }

        if (caller) {
            const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
            io.to(room).emit('callRinging', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
        }
    });

    socket.on('signal', ({ appointmentId, callerId, receiverId, signalData }) => {
        const recipient = onlineUsers.get(receiverId);
        if (recipient) {
            const room = recipient.role === 'patient' ? `patient:${receiverId}` : `doctor:${receiverId}`;
            io.to(room).emit('signal', { appointmentId, callerId, receiverId, signalData });
        }
    });

    socket.on('callAccepted', ({ appointmentId, callerId, recipientId }) => {
        const caller = onlineUsers.get(callerId);
        if (caller) {
            const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
            io.to(room).emit('callAccepted', { appointmentId, callerId, recipientId });
        }
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
    });

    socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
        const caller = onlineUsers.get(callerId);
        if (caller) {
            const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
            io.to(room).emit('callDeclined', { appointmentId, recipientId });
        }
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
    });

    socket.on('hangUp', ({ appointmentId, callerId, recipientId }) => {
        const recipient = onlineUsers.get(recipientId);
        if (recipient) {
            const room = recipient.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
            io.to(room).emit('hangUp', { appointmentId });
        }
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
        io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        console.log(`🔴 Disconnected: ${userId}`);
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
    });
});

connectDB().then(() => {
    server.listen(PORT, () => {
        initializeOfflineUsers();
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
