"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
// src/app/modules/notification/model.ts
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    receiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['vital', 'chat', 'appointment', 'acknowledgment'], required: true },
    message: { type: String, required: true },
    url: { type: String },
    acknowledged: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});
// Check if the model is already defined to prevent OverwriteModelError
const Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.Notification = Notification;
