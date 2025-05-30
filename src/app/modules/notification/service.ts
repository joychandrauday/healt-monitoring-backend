// src/app/modules/notification/service.ts
import { Types } from 'mongoose';
import { NotFoundError } from '../../utils/error';
import { Meta, QueryParams } from '../../types/index';
import { Notification, INotification, NotificationInput } from './model'; // Import all from model

export class NotificationService {
    async createNotification(data: NotificationInput): Promise<INotification> {
        // Validate required fields
        if (!data.sender || !data.receiver || !data.type || !data.message) {
            throw new NotFoundError('Missing required fields: receiver, patientId, type, message');
        }

        const validTypes = ['vital', 'chat', 'appointment', 'acknowledgment', 'vital_feedback'];
        if (!validTypes.includes(data.type)) {
            throw new NotFoundError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate ObjectId format for receiver and patientId
        if (!Types.ObjectId.isValid(data.receiver) || !Types.ObjectId.isValid(data.sender)) {
            throw new NotFoundError('Invalid receiver or patientId');
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
            throw new NotFoundError(`Failed to create notification: ${error.message}`);
        }
    }

    async getNotificationById(id: string): Promise<INotification> {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundError('Invalid notification ID');
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
            throw new NotFoundError('Invalid receiver');
        }

        const { type, acknowledged, page = 1, limit } = query as any;
        const filters: Record<string, any> = { receiver: new Types.ObjectId(receiver) };
        if (type) {
            const validTypes = ['vital', 'chat', 'appointment'];
            if (!validTypes.includes(type)) {
                throw new NotFoundError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
            }
            filters.type = type;
        }
        if (acknowledged !== undefined) {
            filters.acknowledged = acknowledged === 'true';
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = limit ? Math.max(Number(limit), 1) : 20;
        const skip = (pageNumber - 1) * limitNumber;

        // console.log(filters.receiver);
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
            throw new NotFoundError(`Failed to retrieve notifications: ${error.message}`);
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
            throw new NotFoundError(`Failed to acknowledge notification: ${error.message}`);
        }
    }

    async deleteNotification(id: string, receiver: string): Promise<void> {
        if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(receiver)) {
            throw new NotFoundError('Invalid notification ID or receiver');
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
            throw new NotFoundError(`Failed to delete notification: ${error.message}`);
        }
    }

    async clearNotifications(receiver: string, type?: 'vital' | 'chat' | 'appointment'): Promise<void> {
        if (!Types.ObjectId.isValid(receiver)) {
            throw new NotFoundError('Invalid receiver');
        }
        if (type && !['vital', 'chat', 'appointment'].includes(type)) {
            throw new NotFoundError(`Invalid type. Must be one of: vital, chat, appointment`);
        }

        try {
            const query: any = { receiver: new Types.ObjectId(receiver) };
            if (type) {
                query.type = type;
            }
            await Notification.deleteMany(query);
        } catch (error: any) {
            throw new NotFoundError(`Failed to clear notifications: ${error.message}`);
        }
    }

    async getNotificationsByUserId(userId: string, query: any): Promise<{ notifications: INotification[]; meta: any }> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new NotFoundError('Invalid userId');
        }

        try {
            const receiver = new Types.ObjectId(userId);
            const { type, page = 1, limit = 10 } = query;
            const filters: Record<string, any> = { receiver };

            // Apply type filter if provided
            if (type) {
                filters.type = type;
            }

            const pageNumber = Math.max(Number(page), 1);
            const limitNumber = Math.max(Number(limit), 1);
            const skip = (pageNumber - 1) * limitNumber;

            // Get total count for pagination
            const totalNotifications = await Notification.countDocuments(filters);

            // Fetch notifications with pagination, sorting, and population
            const notifications = await Notification.find(filters)
                .sort({ timestamp: -1 }) // Newest first
                .skip(skip)
                .limit(limitNumber)
                .populate({
                    path: 'sender',
                    model: 'User',
                    select: 'name email role avatar _id',
                })
                .populate({
                    path: 'receiver',
                    model: 'User',
                    select: 'name email role avatar _id',
                })
                .lean(); // Convert to plain JavaScript objects for better performance

            return {
                notifications: notifications,
                meta: {
                    total: totalNotifications,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(totalNotifications / limitNumber),
                },
            };
        } catch (error: any) {
            throw new NotFoundError(`Failed to get notifications by userId: ${error.message}`);
        }

    }
}