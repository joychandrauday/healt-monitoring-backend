import { Schema, model } from 'mongoose';
import { ChatMessage } from './interface';

const chatSchema = new Schema<ChatMessage>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  imageUrls: [
    {
      type: String, // URLs of the images
    },
  ],
  timestamp: { type: Date, default: Date.now },
});

export const ChatModel = model<ChatMessage>('Chat', chatSchema);