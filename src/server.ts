import http from 'http';
import { Server, Socket } from 'socket.io';
import app from './app';
import { connectDB } from './app/config';
import { ChatService } from './app/modules/chat/service';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongoose';
import { UserModel } from './app/modules/user/model';

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

// Store io, onlineUsers, and offlineUsers globally
(global as any).io = io;
const onlineUsers = new Map<string, { role: string; name: string; avatar?: string }>();
const offlineUsers = new Map<string, { role: string; name: string; avatar?: string }>();
(global as any).onlineUsers = onlineUsers;
(global as any).offlineUsers = offlineUsers;

// Log Socket.IO initialization
// console.log('Socket.IO initialized:', io ? 'OK' : 'undefined');

const chatService = new ChatService();

// Initialize offline users from database
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
        // console.log('Initialized offline users:', Array.from(offlineUsers.entries()));
    } catch (error) {
        console.error('Error initializing offline users:', error);
    }
};

// Authenticate socket connections and populate user data
io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; name?: string; avatar?: string };
            const user = await UserModel.findById(decoded.id).select('name role avatar').lean();
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
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    } else {
        console.error('No token provided for socket authentication');
        next(new Error('Authentication error'));
    }
});

// Handle socket connections
io.on('connection', (socket: Socket) => {
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
    } else if (role === 'patient') {
        socket.join(`patient:${userId}`);
        // console.log(`Patient auto-joined room: patient:${userId}`);
    } else if (role === 'admin') {
        socket.join(`admin:${userId}`);
        // console.log(`Admin auto-joined room: admin:${userId}`);
    }
    io.emit('userStatus', {
        onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
    });

    socket.on('joinDoctorRoom', ({ doctorId }: { doctorId: string }) => {
        if (socket.data.user.id === doctorId && socket.data.user.role === 'doctor') {
            socket.join(`doctor:${doctorId}`);
            // console.log(`Doctor joined room: doctor:${doctorId}`);
            io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        } else {
            console.error(`Unauthorized join attempt by ${socket.data.user.id} for doctor:${doctorId}`);
        }
    });

    socket.on('joinPatientRoom', ({ patientId }: { patientId: string }) => {
        if (socket.data.user.id === patientId && socket.data.user.role === 'patient') {
            socket.join(`patient:${patientId}`);
            // console.log(`Patient joined room: patient:${patientId}`);
            io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        }
    });

    socket.on('joinAdminRoom', ({ adminId }: { adminId: string }) => {
        if (socket.data.user.id === adminId && socket.data.user.role === 'admin') {
            socket.join(`admin:${adminId}`);
            // console.log(`Admin joined room: admin:${adminId}`);
            io.emit('userStatus', {
                onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
                offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            });
        }
    });

    socket.on('message', async ({ receiverId, message }: { receiverId: ObjectId; message: any }) => {
        try {
            let savedMessage: any;

            if (message._id) {
                savedMessage = {
                    _id: message._id,
                    senderId: socket.data.user.id,
                    receiverId,
                    message: message.message,
                    timestamp: message.timestamp || new Date().toISOString(),
                    imageUrls: message.imageUrls || [],
                };
            } else {
                savedMessage = await chatService.saveMessage({
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
                _id: savedMessage._id!.toString(),
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

            io.to(`patient:${socket.data.user.id}`)
                .to(`doctor:${receiverId}`)
                .to(`patient:${receiverId}`)
                .emit('message', formattedMessage);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle video call initiation
    socket.on('startVideoCall', ({ appointmentId, callerId, recipientId, callerName }) => {
        console.log(`startVideoCall received: ${callerId}, ${recipientId}, ${callerName}, appointmentId: ${appointmentId}`);
        const recipientUser = onlineUsers.get(recipientId);
        const callerUser = onlineUsers.get(callerId);

        if (recipientUser) {
            const recipientRoom = recipientUser.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
            io.to(recipientRoom).emit('receiveVideoCall', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
            console.log(`Emitted receiveVideoCall to ${recipientRoom}`);
        } else {
            socket.emit('callError', { message: 'Recipient is offline' });
            console.log(`Recipient ${recipientId} is offline`);
        }

        if (callerUser) {
            const callerRoom = callerUser.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
            io.to(callerRoom).emit('callRinging', {
                appointmentId,
                callerId,
                recipientId,
                callerName,
            });
            console.log(`Emitted callRinging to ${callerRoom}`);
        }
    });

    socket.on('signal', ({ appointmentId, callerId, receiverId, signalData }) => {
        console.log(`Received signal from ${callerId} to ${receiverId} for appointment ${appointmentId}`);
        const recipientUser = onlineUsers.get(receiverId);
        if (recipientUser) {
            const recipientRoom = recipientUser.role === 'patient' ? `patient:${receiverId}` : `doctor:${receiverId}`;
            io.to(recipientRoom).emit('signal', {
                appointmentId,
                callerId,
                receiverId,
                signalData,
            });
            console.log(`Forwarded signal to ${recipientRoom}`);
        } else {
            console.log(`Recipient ${receiverId} is offline or not found`);
        }
    });

    socket.on('declineVideoCall', ({ appointmentId, callerId, recipientId }) => {
        console.log(`declineVideoCall received: appointmentId: ${appointmentId}, callerId: ${callerId}, recipientId: ${recipientId}`);
        const callerUser = onlineUsers.get(callerId);
        if (callerUser) {
            const callerRoom = callerUser.role === 'patient' ? `patient:${callerId}` : `doctor:${callerId}`;
            io.to(callerRoom).emit('callDeclined', {
                appointmentId,
                recipientId,
            });
            console.log(`Emitted callDeclined to ${callerRoom}`);
        }
    });

    socket.on('hangUp', ({ appointmentId, callerId, recipientId }) => {
        console.log(`hangUp received: appointmentId: ${appointmentId}, callerId: ${callerId}, recipientId: ${recipientId}`);
        const recipientUser = onlineUsers.get(recipientId);
        if (recipientUser) {
            const recipientRoom = recipientUser.role === 'patient' ? `patient:${recipientId}` : `doctor:${recipientId}`;
            io.to(recipientRoom).emit('hangUp', { appointmentId });
            console.log(`Emitted hangUp to ${recipientRoom}`);
        }
    });

    socket.on('logout', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
        socket.disconnect();
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        offlineUsers.set(userId, { role, name, avatar });
        io.emit('userStatus', {
            onlineUsers: Array.from(onlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
            offlineUsers: Array.from(offlineUsers.entries()).map(([id, { role, name, avatar }]) => ({ id, role, name, avatar })),
        });
    });
});

const startServer = async () => {
    try {
        await connectDB();
        await initializeOfflineUsers(); // Initialize offline users after DB connection
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

startServer();

export default server;