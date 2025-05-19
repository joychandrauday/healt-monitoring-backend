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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatEvents = void 0;
const service_1 = require("../modules/chat/service");
const chatService = new service_1.ChatService();
const registerChatEvents = (io, socket) => {
    socket.on('chat:join', (room) => {
        socket.join(room);
    });
    socket.on('chat:message', (_a) => __awaiter(void 0, [_a], void 0, function* ({ room, message, senderId, receiverId }) {
        const savedMessage = yield chatService.saveMessage({
            senderId,
            receiverId,
            message,
        });
        io.to(room).emit('chat:message', savedMessage);
    }));
    socket.on('chat:typing', ({ room, userId }) => {
        socket.to(room).emit('chat:typing', { userId });
    });
};
exports.registerChatEvents = registerChatEvents;
