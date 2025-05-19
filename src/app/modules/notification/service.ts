// src/app/modules/notification/service.ts
import { Types } from 'mongoose';
import { AppError, NotFoundError } from '../../utils/error';
import { Meta, QueryParams } from '../../types/index';
import { Notification, INotification, NotificationInput } from './model'; // Import all from model

export class NotificationService {
    async createNotification(data: NotificationInput): Promise<INotification> {
        // Validate required fields
        if (!data.sender || !data.receiver || !data.type || !data.message) {
            throw new AppError('Missing required fields: receiver, patientId, type, message', 400);
        }

        const validTypes = ['vital', 'chat', 'appointment'];
        if (!validTypes.includes(data.type)) {
            throw new AppError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
        }

        // Validate ObjectId format for receiver and patientId
        if (!Types.ObjectId.isValid(data.receiver) || !Types.ObjectId.isValid(data.sender)) {
            throw new AppError('Invalid receiver or patientId', 400);
        }

        try {
            const notification = await Notification.create({
                receiver: new Types.ObjectId(data.receiver),
                sender: new Types.ObjectId(data.sender),
                type: data.type,
                message: data.message,
                url: data.url,
                acknowledged: data.acknowledged ?? false, // Use default if undefined
                timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
            });
            return notification;
        } catch (error: any) {
            throw new AppError(`Failed to create notification: ${error.message}`, 500);
        }
    }

    async getNotificationById(id: string): Promise<INotification> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid notification ID', 400);
        }

        const notification = await Notification.findById(id)
            .populate('patientId', 'name email avatar _id')
            .populate('receiver', 'name email avatar _id');
        if (!notification) {
            throw new NotFoundError('Notification not found');
        }
        return notification;
    }

    async getAllNotifications(
        query: QueryParams,
        receiver: string
    ): Promise<{ notifications: INotification[]; meta: Meta }> {
        if (!Types.ObjectId.isValid(receiver)) {
            throw new AppError('Invalid receiver', 400);
        }

        const { type, acknowledged, page = 1, limit } = query as any;

        const filters: Record<string, any> = { receiver: new Types.ObjectId(receiver) };
        if (type) {
            const validTypes = ['vital', 'chat', 'appointment'];
            if (!validTypes.includes(type)) {
                throw new AppError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
            }
            filters.type = type;
        }
        if (acknowledged !== undefined) {
            filters.acknowledged = acknowledged === 'true';
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = limit ? Math.max(Number(limit), 1) : 20;
        const skip = (pageNumber - 1) * limitNumber;

        try {
            const totalNotifications = await Notification.countDocuments(filters);
            const notifications = await Notification.find(filters)
                .populate('patientId', 'name email avatar _id')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNumber);

            const meta: Meta = {
                total: totalNotifications,
                page: pageNumber,
                limit: limitNumber,
                totalPages: limitNumber > 0 ? Math.ceil(totalNotifications / limitNumber) : 1,
            };

            return { notifications, meta };
        } catch (error: any) {
            throw new AppError(`Failed to retrieve notifications: ${error.message}`, 500);
        }
    }

    async acknowledgeNotification(id: string, receiver: string): Promise<INotification> {

        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: new Types.ObjectId(id) },
                { acknowledged: true },
                { new: true, runValidators: true }
            );
            if (!notification) {
                throw new NotFoundError('Notification not found or not authorized');
            }
            return notification;
        } catch (error: any) {
            throw new AppError(`Failed to acknowledge notification: ${error.message}`, 500);
        }
    }

    async deleteNotification(id: string, receiver: string): Promise<void> {
        if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(receiver)) {
            throw new AppError('Invalid notification ID or receiver', 400);
        }

        try {
            const notification = await Notification.findOneAndDelete({
                _id: new Types.ObjectId(id),
                receiver: new Types.ObjectId(receiver),
            });
            if (!notification) {
                throw new NotFoundError('Notification not found or not authorized');
            }
        } catch (error: any) {
            throw new AppError(`Failed to delete notification: ${error.message}`, 500);
        }
    }

    async clearNotifications(receiver: string, type?: 'vital' | 'chat' | 'appointment'): Promise<void> {
        if (!Types.ObjectId.isValid(receiver)) {
            throw new AppError('Invalid receiver', 400);
        }
        if (type && !['vital', 'chat', 'appointment'].includes(type)) {
            throw new AppError(`Invalid type. Must be one of: vital, chat, appointment`, 400);
        }

        try {
            const query: any = { receiver: new Types.ObjectId(receiver) };
            if (type) {
                query.type = type;
            }
            await Notification.deleteMany(query);
        } catch (error: any) {
            throw new AppError(`Failed to clear notifications: ${error.message}`, 500);
        }
    }

    async getNotificationsByUserId(userId: string): Promise<INotification[]> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new AppError('Invalid userId', 400);
        }

        try {
            const objectId = new Types.ObjectId(userId);
            const notifications = await Notification.find({
                receiver: objectId
            })
                .sort({ timestamp: -1 })
                .populate({
                    path: 'sender',
                    model: 'User',
                    select: 'name email avatar _id',
                })
                .populate({
                    path: 'receiver',
                    model: 'User',
                    select: 'name email avatar _id',
                });

            return notifications;
        } catch (error: any) {
            throw new AppError(`Failed to get notifications by userId: ${error.message}`, 500);
        }
    }
}