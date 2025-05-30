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
exports.ChatService = void 0;
const model_1 = require("./model");
const error_1 = require("../../utils/error");
class ChatService {
    saveMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return model_1.ChatModel.create(data);
        });
    }
    getChatHistory(senderId, receiverId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { search, page = 1, limit = 10 } = query;
                const filters = {
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
                const total = yield model_1.ChatModel.countDocuments(filters);
                const chats = yield model_1.ChatModel.find(filters)
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limitNumber)
                    .populate('senderId', 'name email avatar')
                    .populate('receiverId', 'name email avatar');
                const meta = {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(total / limitNumber),
                };
                return { chats, meta };
            }
            catch (error) {
                console.error('❌ Error in getChatHistory:', error);
                throw new error_1.AppError(error.message || 'Failed to fetch chat history', 500);
            }
        });
    }
    getUniqueSenders(receiverId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10 } = query;
            console.log(receiverId);
            const pageNumber = Number(page) > 0 ? Number(page) : 1;
            const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
            const skip = (pageNumber - 1) * limitNumber;
            // Get all unique sender IDs
            const allUniqueSenders = yield model_1.ChatModel.distinct('senderId', { receiverId });
            // Apply pagination manually
            const paginatedSenders = allUniqueSenders.slice(skip, skip + limitNumber);
            // Fetch user details and last message for paginated senders
            const senders = yield Promise.all(paginatedSenders.map((senderId) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const lastMessage = yield model_1.ChatModel.findOne({
                    $or: [
                        { senderId: senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId },
                    ],
                })
                    .sort({ timestamp: -1 })
                    .populate('senderId', 'name avatar')
                    .lean();
                const doc = yield model_1.ChatModel.findOne({ senderId, receiverId })
                    .populate('senderId', 'name avatar')
                    .lean();
                return {
                    userId: senderId.toString(),
                    name: ((_a = doc === null || doc === void 0 ? void 0 : doc.senderId) === null || _a === void 0 ? void 0 : _a.name) || `Patient ${senderId.toString().slice(0, 8)}`,
                    avatar: ((_b = doc === null || doc === void 0 ? void 0 : doc.senderId) === null || _b === void 0 ? void 0 : _b.avatar) || `/avatar_male.png`,
                    lastMessage: lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.message,
                    lastMessageTimestamp: (_c = lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.timestamp) === null || _c === void 0 ? void 0 : _c.toISOString(),
                };
            })));
            const total = allUniqueSenders.length;
            const meta = {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
            };
            return { senders, meta };
        });
    }
}
exports.ChatService = ChatService;
