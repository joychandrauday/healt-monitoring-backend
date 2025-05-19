export interface ChatMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  message?: string;         // Optional: could be text or empty if only image
  imageUrls?: string[];        // Optional: image link if sent
  timestamp: Date;
}
