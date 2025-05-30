import { Schema } from "mongoose";

export interface ChatMessage {
  _id: string;
  senderId: Schema.Types.ObjectId;
  receiverId: Schema.Types.ObjectId;
  message?: string;         // Optional: could be text or empty if only image
  imageUrls?: string[];        // Optional: image link if sent
  timestamp: Date;
}
