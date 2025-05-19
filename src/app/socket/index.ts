import { Server, Socket } from 'socket.io';
import { registerChatEvents } from './chat';
import { registerVitalsEvents } from './vitals';

export const registerSocketEvents = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        registerChatEvents(io, socket);
        registerVitalsEvents(io, socket);
    });
};