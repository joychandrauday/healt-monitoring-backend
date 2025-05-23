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
import { VitalsService } from '../vitals/service';

const notificationService = new NotificationService();
const userService = new UserService();
const vitalService = new VitalsService();

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
    console.log(req.body);
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
    console.log(notification);
    const user = await userService.getUserById(userId as string);
    if (notification.type !== 'acknowledgment') {
        let message = '';
        let url = '';
        const revUrl = getLastUrlSegment(notification.url as string)
        switch (notification.type) {
            case 'vital':
                message = `Your vital submission has been acknowledged by Dr. ${user?.name || 'Doctor'}`;
                url = `/patient/dashboard/vitals/${revUrl}`;
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
        if (notification.type === 'vital') {
            const vital = await vitalService.updateVital(revUrl, { "status": "acknowledged" })
        }
        const newPatientNotification: NotificationInput = {
            receiver: notification.sender.toString(), // Doctor ID
            sender: notification.receiver.toString(), // Patient ID
            type: 'acknowledgment',
            message,
            url,
            timestamp: new Date(),
            acknowledged: false,
        };

        const savedNotification = await notificationService.createNotification(newPatientNotification);

        // Emit the acknowledgment notification to the patient's room
        console.log('Emitting to room:', `patient:${newPatientNotification.receiver}`);
        io.to(`patient:${newPatientNotification.receiver}`).emit('notification:acknowledged', {
            sender: newPatientNotification.sender,
            notificationId: savedNotification._id,
            message: newPatientNotification.message,
            notification: {
                ...savedNotification,
                timestamp: savedNotification.timestamp.toISOString(),
            },
        });

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: 'Notification acknowledged successfully',
            data: notification,
        });
    } else {
        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: 'Notification acknowledged successfully',
            data: notification,
        });
    }

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

    const notifications = await notificationService.getNotificationsByUserId(userId, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
    });
});

export function getLastUrlSegment(url: string): string {
    try {
        // Remove query parameters and hash, if any
        const path = url.split('?')[0].split('#')[0];
        // Split by '/' and filter out empty segments
        const segments = path.split('/').filter(segment => segment.length > 0);
        // Return the last segment, or empty string if none exist
        return segments.length > 0 ? segments[segments.length - 1] : '';
    } catch (error) {
        console.error('Error extracting last URL segment:', error);
        return '';
    }
}