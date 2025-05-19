import { Request, Response } from 'express';
import { ChatService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';

const chatService = new ChatService();

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
    const chats = await chatService.getChatHistory(req.params.userId, req.params);
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
        message: "Messages retrieve successfully!",
        data: message,
    });
});