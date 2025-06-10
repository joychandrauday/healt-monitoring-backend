import http from 'http';
import { Server, Socket } from 'socket.io';
import app from './app';
import { connectDB } from './app/config';
import { ChatService } from './app/modules/chat/service';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { UserModel } from './app/modules/user/model';
import { ObjectId } from 'mongoose';

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
        console.log('Initialized online  users:', Array.from(onlineUsers.entries()));
    } catch (error) {
        console.error('Error initializing offline users:', error);
    }
};

io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        console.error('No token provided');
        return next(new Error('Authentication error: No token'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: string;
            role: string;
            name?: string;
            avatar?: string;
        };
        const user = await UserModel.findById(decoded.id).select('name role avatar').lean();
        if (!user) {
            console.error('User not found for ID:', decoded.id);
            return next(new Error('Authentication error: User not found'));
        }
        socket.data.user = {
            id: decoded.id,
            role: user.role || decoded.role,
            name: user.name || decoded.id,
            avatar: user.avatar || undefined,
        };
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
    }
});

io.on('connection', (socket: Socket) => {
    const { id: userId, role, name, avatar } = socket.data.user;

    onlineUsers.set(userId, { role, name, avatar });
    offlineUsers.delete(userId);

    console.log(`🟢 Connected: ${socket.id}, User: ${userId}, Role: ${role}, Name: ${name}`);

    socket.join(`${role}:${userId}`);
    console.log(`${role} joined room: ${role}:${userId}`);

    const emitUserStatus = () => {
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
        console.log('Emitted userStatus for:', userId);
    };

    emitUserStatus();

    // Handle request for userStatus
    socket.on('requestUserStatus', () => {
        socket.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
        console.log('Emitted userStatus on request for socket:', socket.id);


        socket.on('joinDoctorRoom', ({ doctorId }: { doctorId: string }) => {
            if (!doctorId) return;
            if (userId === doctorId && role === 'doctor') {
                socket.join(`doctor:${doctorId}`);
                console.log(`Doctor joined room: doctor:${doctorId}`);
            }
        });

        socket.on('joinPatientRoom', ({ patientId }: { patientId: string }) => {
            if (!patientId) return;
            if (userId === patientId && role === 'patient') {
                socket.join(`patient:${patientId}`);
                console.log(`Patient joined room: patient:${patientId}`);
            }
        });

        socket.on('joinAdminRoom', ({ adminId }: { adminId: string }) => {
            if (!adminId) return;
            if (userId === adminId && role === 'admin') {
                socket.join(`admin:${adminId}`);
                console.log(`Admin joined room: admin:${adminId}`);
            }
        });

        socket.on('message', async ({ receiverId, message }: { receiverId: ObjectId; message: any }) => {
            if (!receiverId || !message) {
                console.error('Invalid message data:', { receiverId, message });
                return;
            }
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
            if (!appointmentId || !callerId || !recipientId || !callerName) {
                console.error('Invalid startVideoCall data:', { appointmentId, callerId, recipientId, callerName });
                socket.emit('callError', { message: 'Invalid call data', appointmentId });
                return;
            }
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
                console.log(`Emitted startVideoCall to ${room}`);
            } else {
                socket.emit('callError', { message: 'Recipient is offline', appointmentId });
                console.log(`startVideoCall failed: Recipient ${recipientId} is offline`);
            }

            if (caller) {
                const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
                io.to(room).emit('callRinging', {
                    appointmentId,
                    callerId,
                    recipientId,
                    callerName,
                });
                console.log(`Emitted callRinging to ${room}`);
            }
        });

        socket.on('signal', ({ appointmentId, callerId, receiverId, signalData }) => {
            if (!appointmentId || !callerId || !receiverId || !signalData) {
                console.error('Invalid signal data:', { appointmentId, callerId, receiverId });
                return;
            }
            const recipient = onlineUsers.get(receiverId);
            if (recipient) {
                const room = recipient.role === 'patient' ? `patient:${receiverId}` : `doctor:${receiverId}`;
                io.to(room).emit('signal', { appointmentId, callerId, receiverId, signalData });
                console.log(`Emitted signal to ${room}`);
            }
        });

        socket.on('callAccepted', ({ appointmentId, callerId, recipientId }) => {
            if (!appointmentId || !callerId || !recipientId) {
                console.error('Invalid callAccepted data:', { appointmentId, callerId, recipientId });
                return;
            }
            const caller = onlineUsers.get(callerId);
            if (caller) {
                const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
                io.to(room).emit('callAccepted', { appointmentId, callerId, recipientId });
                console.log(`Emitted callAccepted to ${room}`);
            }
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
            console.log(`Emitted clearCallState for ${recipientId} and ${callerId}`);
        });

        socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
            if (!appointmentId || !callerId || !recipientId) {
                console.error('Invalid declineVideoCall data:', { appointmentId, callerId, recipientId });
                return;
            }
            const caller = onlineUsers.get(callerId);
            if (caller) {
                const room = caller.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
                io.to(room).emit('callDeclined', { appointmentId });
                console.log(`Emitted callDeclined to ${room}`);
            }
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
            console.log(`Emitted clearCallState for ${recipientId} and ${callerId}`);
        });

        socket.on('hangUp', ({ appointmentId, callerId, recipientId }) => {
            if (!appointmentId || !callerId || !recipientId) {
                console.error('Invalid hangUp data:', { appointmentId, callerId, recipientId });
                return;
            }
            const recipient = onlineUsers.get(recipientId);
            if (recipient) {
                const room = recipient.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
                io.to(room).emit('hangUp', { appointmentId });
                console.log(`Emitted hangUp to ${room}`);
            }
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: recipientId });
            io.to(`patient:${recipientId}`).to(`doctor:${callerId}`).emit('clearCallState', { userId: callerId });
            console.log(`Emitted clearCallState for ${recipientId} and ${callerId}`);
        });

        socket.on('clearCallState', ({ userId }: { userId: string }) => {
            if (!userId) {
                console.error('Invalid clearCallState data:', { userId });
                return;
            }
            io.to(`patient:${userId}`).to(`doctor:${userId}`).emit('clearCallState', { userId });
            console.log(`Emitted clearCallState for ${userId}`);
        });

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            offlineUsers.set(userId, { role, name, avatar });
            console.log(`🔴 Disconnected: ${userId}`);
            emitUserStatus();
            socket.leave(`${role}:${userId}`);
        });
    });
});

connectDB().then(() => {
    server.listen(PORT, () => {
        initializeOfflineUsers();
        console.log(`🚗 Server running on port ${PORT}`);
    });
});