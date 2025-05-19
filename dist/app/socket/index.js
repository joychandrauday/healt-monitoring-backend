"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketEvents = void 0;
const chat_1 = require("./chat");
const vitals_1 = require("./vitals");
const registerSocketEvents = (io) => {
    io.on('connection', (socket) => {
        (0, chat_1.registerChatEvents)(io, socket);
        (0, vitals_1.registerVitalsEvents)(io, socket);
    });
};
exports.registerSocketEvents = registerSocketEvents;
