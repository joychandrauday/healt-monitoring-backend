"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModel = void 0;
const mongoose_1 = require("mongoose");
const chatSchema = new mongoose_1.Schema({
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    imageUrls: [
        {
            type: String, // URLs of the images
        },
    ],
    timestamp: { type: Date, default: Date.now },
});
exports.ChatModel = (0, mongoose_1.model)('Chat', chatSchema);
