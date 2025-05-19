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
class ChatService {
    saveMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return model_1.ChatModel.create(data);
        });
    }
    getChatHistory(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { search, page = 1, limit = 10 } = query;
            const filters = {
                $or: [{ senderId: userId }, { receiverId: userId }],
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
        });
    }
}
exports.ChatService = ChatService;
