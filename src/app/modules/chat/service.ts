import { ChatModel } from './model';
import { ChatMessage } from './interface';
import { AppError } from '../../utils/error';
import { QueryParams } from '../../types';

export class ChatService {
    async saveMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
        return ChatModel.create(data);
    }
    async getChatHistory(userId: string, query: QueryParams): Promise<{ chats: ChatMessage[]; meta: any }> {
        const { search, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = {
            $or: [{ senderId: userId }, { receiverId: userId }],
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
            .sort({ timestamp: -1 }) // oldest first
            .skip(skip)
            .limit(limitNumber)
            .populate('senderId')
            .populate('receiverId');

        const meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };
        return { chats, meta };
    }
}