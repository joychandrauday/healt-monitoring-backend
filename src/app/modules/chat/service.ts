import { ChatModel } from './model';
import { ChatMessage } from './interface';
import { AppError } from '../../utils/error';
import { Meta, QueryParams } from '../../types';
import { Types } from 'mongoose';
import { User } from '../user/interface';

interface LeanChatMessage {
    _id: string;
    senderId: User | null;
    receiverId: string;
    message?: string;
    timestamp: Date;
    imageUrls?: string[];
}

export class ChatService {
    async saveMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
        return ChatModel.create(data);
    }

    async getChatHistory(
        senderId: string,
        receiverId: string,
        query: QueryParams
    ): Promise<{ chats: ChatMessage[]; meta: Meta }> {
        try {
            const { search, page = 1, limit = 10 } = query;

            const filters: Record<string, any> = {
                $or: [
                    { senderId: senderId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            };

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filters.message = searchRegex;
            }

            const pageNumber = Number(page) > 0 ? Number(page) : 1;
            const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
            const skip = (pageNumber - 1) * limitNumber;

            const total = await ChatModel.countDocuments(filters);

            const chats = await ChatModel.find(filters)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNumber)
                .populate('senderId', 'name email avatar')
                .populate('receiverId', 'name email avatar');

            const meta: Meta = {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
            };

            return { chats, meta };
        } catch (error: any) {
            console.error('❌ Error in getChatHistory:', error);
            throw new AppError(error.message || 'Failed to fetch chat history', 500);
        }
    }

    async getUniqueSenders(receiverId: string, query: QueryParams): Promise<{ senders: any[]; meta: Meta }> {
        const { page = 1, limit = 10 } = query;
        console.log(receiverId);
        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        // Get all unique sender IDs
        const allUniqueSenders = await ChatModel.distinct('senderId', { receiverId });

        // Apply pagination manually
        const paginatedSenders = allUniqueSenders.slice(skip, skip + limitNumber);

        // Fetch user details and last message for paginated senders
        const senders = await Promise.all(
            paginatedSenders.map(async (senderId) => {
                const lastMessage = await ChatModel.findOne({
                    $or: [
                        { senderId: senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId },
                    ],
                })
                    .sort({ timestamp: -1 })
                    .populate<{ senderId: User }>('senderId', 'name avatar')
                    .lean();

                const doc = await ChatModel.findOne({ senderId, receiverId })
                    .populate<{ senderId: User }>('senderId', 'name avatar')
                    .lean();

                return {
                    userId: senderId.toString(),
                    name: doc?.senderId?.name || `Patient ${senderId.toString().slice(0, 8)}`,
                    avatar: doc?.senderId?.avatar || `/avatar_male.png`,
                    lastMessage: lastMessage?.message,
                    lastMessageTimestamp: lastMessage?.timestamp?.toISOString(),
                };
            })
        );

        const total = allUniqueSenders.length;

        const meta: Meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };

        return { senders, meta };
    }
}