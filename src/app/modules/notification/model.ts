// src/app/modules/notification/model.ts
import { Schema, model, Types, Model } from 'mongoose';

export interface INotification {
    _id: string;
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    type: 'vital' | 'chat' | 'appointment' | 'acknowledgment' | 'vital_feedback';
    message: string;
    foreignId?: string;
    url?: string;
    acknowledged: boolean;
    timestamp: Date;
}

export interface NotificationInput {
    receiver: string;
    sender: string;
    type: 'vital' | 'chat' | 'appointment' | 'acknowledgment' | 'vital_feedback';
    message: string;
    foreignId?: string;
    url?: string;
    acknowledged?: boolean;
    timestamp?: Date;
}

const notificationSchema = new Schema<INotification>({
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['vital', 'chat', 'appointment', 'acknowledgment', 'vital_feedback'], required: true },
    message: { type: String, required: true },
    foreignId: { type: String, },
    url: { type: String },
    acknowledged: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

// Check if the model is already defined to prevent OverwriteModelError
const Notification: Model<INotification> =
    model<INotification>('Notification', notificationSchema);

export { Notification };