import { Server, Socket } from 'socket.io';

export const registerVitalsEvents = (io: Server, socket: Socket) => {
    socket.on('vital:submit', (vital: any) => {
        socket.to(`doctor:${vital.patientId}`).emit('vital:alert', vital);
    });
};