import { Server, Socket } from 'socket.io';
import { ChatService } from '../modules/chat/service';

const chatService = new ChatService();

export const registerChatEvents = (io: Server, socket: Socket) => {
    socket.on('chat:join', (room: string) => {
        socket.join(room);
    });

    socket.on('chat:message', async ({ room, message, senderId, receiverId }) => {
        const savedMessage = await chatService.saveMessage({
            senderId,
            receiverId,
            message,
        });
        io.to(room).emit('chat:message', savedMessage);
    });

    socket.on('chat:typing', ({ room, userId }) => {
        socket.to(room).emit('chat:typing', { userId });
    });
};