import { Request, Response } from 'express';
import { ChatService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

const chatService = new ChatService();

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
    const { senderId, receiverId } = req.params;

    if (!senderId || !receiverId) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: 'senderId and receiverId are required',
            data: null,
        });
    }

    if (!Types.ObjectId.isValid(senderId) || !Types.ObjectId.isValid(receiverId)) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: `Invalid senderId or receiverId: ${senderId}, ${receiverId}`,
            data: null,
        });
    }

    const chats = await chatService.getChatHistory(senderId, receiverId, req.query as any);
    res.status(200).json(chats);
});

export const sendMessage = asyncHandler(async (req: CustomRequest, res: Response) => {
    const message = await chatService.saveMessage({
        ...req.body,
        senderId: req.user!.id,
    });
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: 'Message sent successfully!',
        data: message,
    });
});

export const getUniqueSenders = asyncHandler(async (req: Request, res: Response) => {
    const receiverId = req.params.receiverId;
    const query = req.query as any;

    if (!Types.ObjectId.isValid(receiverId)) {
        return sendResponse(res, {
            statusCode: StatusCodes.BAD_REQUEST,
            success: false,
            message: `Invalid receiverId: ${receiverId}`,
            data: null,
        });
    }

    const senders = await chatService.getUniqueSenders(receiverId, query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Unique senders retrieved successfully!',
        data: senders,
    });
});