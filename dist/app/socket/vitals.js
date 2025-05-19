"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVitalsEvents = void 0;
const registerVitalsEvents = (io, socket) => {
    socket.on('vital:submit', (vital) => {
        socket.to(`doctor:${vital.patientId}`).emit('vital:alert', vital);
    });
};
exports.registerVitalsEvents = registerVitalsEvents;
