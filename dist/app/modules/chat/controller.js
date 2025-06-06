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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniqueSenders = exports.sendMessage = exports.getChatHistory = void 0;
const service_1 = require("./service");
const asyncHandler_1 = require("../../utils/asyncHandler");
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const chatService = new service_1.ChatService();
exports.getChatHistory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderId, receiverId } = req.params;
    if (!senderId || !receiverId) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
            success: false,
            message: 'senderId and receiverId are required',
            data: null,
        });
    }
    if (!mongoose_1.Types.ObjectId.isValid(senderId) || !mongoose_1.Types.ObjectId.isValid(receiverId)) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
            success: false,
            message: `Invalid senderId or receiverId: ${senderId}, ${receiverId}`,
            data: null,
        });
    }
    const chats = yield chatService.getChatHistory(senderId, receiverId, req.query);
    res.status(200).json(chats);
}));
exports.sendMessage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield chatService.saveMessage(Object.assign(Object.assign({}, req.body), { senderId: req.user.id }));
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: 'Message sent successfully!',
        data: message,
    });
}));
exports.getUniqueSenders = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const receiverId = req.params.receiverId;
    const query = req.query;
    if (!mongoose_1.Types.ObjectId.isValid(receiverId)) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
            success: false,
            message: `Invalid receiverId: ${receiverId}`,
            data: null,
        });
    }
    const senders = yield chatService.getUniqueSenders(receiverId, query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Unique senders retrieved successfully!',
        data: senders,
    });
}));
