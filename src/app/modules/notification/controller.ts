// src/app/modules/notification/controller.ts
import { Request, Response } from 'express';
import { NotificationService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../../utils/error';
import { CustomRequest } from '../../types';
import { UserService } from '../user/service';
import { io } from '../../../server';
import { INotification, NotificationInput } from './model'; // Import interfaces from model

const notificationService = new NotificationService();
const userService = new UserService();

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.createNotification(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Notification created successfully',
        data: notification,
    });
});

export const getNotification = asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.getNotificationById(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notification retrieved successfully',
        data: notification,
    });
});

export const getAllNotifications = asyncHandler(async (req: CustomRequest, res: Response) => {
    const doctorId = req.user?._id;
    if (!doctorId) throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED);

    const { notifications, meta } = await notificationService.getAllNotifications(req.query, doctorId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notifications retrieved successfully',
        data: { notifications, meta },
    });
});

export const acknowledgeNotification = asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    const notification = await notificationService.acknowledgeNotification(req.params.id, userId as string);
    const user = await userService.getUserById(userId as string);

    let message = '';
    let url = '';

    switch (notification.type) {
        case 'vital':
            message = `Your vital submission has been acknowledged by Dr. ${user?.name || 'Doctor'}`;
            url = `/patient/vitals/${notification._id}`;
            break;

        case 'chat':
            message = `Your message has been acknowledged by Dr. ${user?.name || 'User'}`;
            url = `/chat/${notification.sender.toString()}`;
            break;

        case 'appointment':
            message = `Your appointment request has been acknowledged by Dr. ${user?.name || 'User'}`;
            url = `/patient/dashboard/appointments/${notification._id}`;
            break;

        default:
            message = `You have a new notification from Dr. ${user?.name || 'Doctor'}`;
            url = `/patient/dashboard/notifications/${notification._id}`;
            break;
    }

    const newPatientNotification: NotificationInput = {
        receiver: notification.sender.toString(),
        sender: notification.receiver.toString(),
        type: notification.type,
        message,
        url,
        timestamp: new Date(),
        acknowledged: true,
    };

    // Save the new notification
    const savedNotification = await notificationService.createNotification(newPatientNotification);

    // Emit notification:acknowledged to patient
    console.log('Emitting to room:', `user:${notification.sender}`);
    io.to(`user:${notification.sender}`).emit('notification:acknowledged', {
        patientId: notification.sender.toString(),
        notificationId: savedNotification._id,
        message: newPatientNotification.message,
        notification: savedNotification,
    });

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notification acknowledged successfully',
        data: notification,
    });
});

export const deleteNotification = asyncHandler(async (req: CustomRequest, res: Response) => {
    const doctorId = req.user?._id;
    if (!doctorId) throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED);

    await notificationService.deleteNotification(req.params.id, doctorId);
    sendResponse(res, {
        statusCode: StatusCodes.NO_CONTENT,
        success: true,
        message: 'Notification deleted successfully',
        data: null,
    });
});

export const clearNotifications = asyncHandler(async (req: CustomRequest, res: Response) => {
    const doctorId = req.user?._id;
    if (!doctorId) throw new AppError('User not authenticated', StatusCodes.UNAUTHORIZED);

    const type = req.query.type as 'vital' | 'chat' | 'appointment' | undefined;
    await notificationService.clearNotifications(doctorId, type);

    sendResponse(res, {
        statusCode: StatusCodes.NO_CONTENT,
        success: true,
        message: 'Notifications cleared successfully',
        data: null,
    });
});

export const getNotificationsByUserId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;

    if (!userId) {
        throw new AppError('User ID is required', StatusCodes.BAD_REQUEST);
    }

    const notifications = await notificationService.getNotificationsByUserId(userId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
    });
});