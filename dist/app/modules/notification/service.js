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
exports.NotificationService = void 0;
// src/app/modules/notification/service.ts
const mongoose_1 = require("mongoose");
const error_1 = require("../../utils/error");
const model_1 = require("./model"); // Import all from model
class NotificationService {
    createNotification(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Validate required fields
            if (!data.sender || !data.receiver || !data.type || !data.message) {
                throw new error_1.NotFoundError('Missing required fields: receiver, patientId, type, message');
            }
            const validTypes = ['vital', 'chat', 'appointment', 'acknowledgment', 'vital_feedback'];
            if (!validTypes.includes(data.type)) {
                throw new error_1.NotFoundError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
            }
            // Validate ObjectId format for receiver and patientId
            if (!mongoose_1.Types.ObjectId.isValid(data.receiver) || !mongoose_1.Types.ObjectId.isValid(data.sender)) {
                throw new error_1.NotFoundError('Invalid receiver or patientId');
            }
            try {
                const notification = yield model_1.Notification.create({
                    receiver: new mongoose_1.Types.ObjectId(data.receiver),
                    sender: new mongoose_1.Types.ObjectId(data.sender),
                    type: data.type,
                    message: data.message,
                    url: data.url,
                    acknowledged: (_a = data.acknowledged) !== null && _a !== void 0 ? _a : false, // Use default if undefined
                    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                });
                return notification;
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to create notification: ${error.message}`);
            }
        });
    }
    getNotificationById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                throw new error_1.NotFoundError('Invalid notification ID');
            }
            const notification = yield model_1.Notification.findById(id)
                .populate('patientId', 'name email avatar _id')
                .populate('receiver', 'name email avatar _id');
            if (!notification) {
                throw new error_1.NotFoundError('Notification not found');
            }
            return notification;
        });
    }
    getAllNotifications(query, receiver) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(receiver)) {
                throw new error_1.NotFoundError('Invalid receiver');
            }
            const { type, acknowledged, page = 1, limit } = query;
            const filters = { receiver: new mongoose_1.Types.ObjectId(receiver) };
            if (type) {
                const validTypes = ['vital', 'chat', 'appointment'];
                if (!validTypes.includes(type)) {
                    throw new error_1.NotFoundError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
                }
                filters.type = type;
            }
            if (acknowledged !== undefined) {
                filters.acknowledged = acknowledged === 'true';
            }
            const pageNumber = Math.max(Number(page) || 1, 1);
            const limitNumber = limit ? Math.max(Number(limit), 1) : 20;
            const skip = (pageNumber - 1) * limitNumber;
            console.log(filters.receiver);
            try {
                const totalNotifications = yield model_1.Notification.countDocuments(filters);
                const notifications = yield model_1.Notification.find(filters)
                    .populate('patientId', 'name email avatar _id')
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limitNumber);
                const meta = {
                    total: totalNotifications,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: limitNumber > 0 ? Math.ceil(totalNotifications / limitNumber) : 1,
                };
                return { notifications, meta };
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to retrieve notifications: ${error.message}`);
            }
        });
    }
    acknowledgeNotification(id, receiver) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const notification = yield model_1.Notification.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(id) }, { acknowledged: true }, { new: true, runValidators: true });
                if (!notification) {
                    throw new error_1.NotFoundError('Notification not found or not authorized');
                }
                return notification;
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to acknowledge notification: ${error.message}`);
            }
        });
    }
    deleteNotification(id, receiver) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(id) || !mongoose_1.Types.ObjectId.isValid(receiver)) {
                throw new error_1.NotFoundError('Invalid notification ID or receiver');
            }
            try {
                const notification = yield model_1.Notification.findOneAndDelete({
                    _id: new mongoose_1.Types.ObjectId(id),
                    receiver: new mongoose_1.Types.ObjectId(receiver),
                });
                if (!notification) {
                    throw new error_1.NotFoundError('Notification not found or not authorized');
                }
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to delete notification: ${error.message}`);
            }
        });
    }
    clearNotifications(receiver, type) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(receiver)) {
                throw new error_1.NotFoundError('Invalid receiver');
            }
            if (type && !['vital', 'chat', 'appointment'].includes(type)) {
                throw new error_1.NotFoundError(`Invalid type. Must be one of: vital, chat, appointment`);
            }
            try {
                const query = { receiver: new mongoose_1.Types.ObjectId(receiver) };
                if (type) {
                    query.type = type;
                }
                yield model_1.Notification.deleteMany(query);
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to clear notifications: ${error.message}`);
            }
        });
    }
    getNotificationsByUserId(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(userId)) {
                throw new error_1.NotFoundError('Invalid userId');
            }
            try {
                const receiver = new mongoose_1.Types.ObjectId(userId);
                const { type, page = 1, limit = 10 } = query;
                const filters = { receiver };
                // Apply type filter if provided
                if (type) {
                    filters.type = type;
                }
                const pageNumber = Math.max(Number(page), 1);
                const limitNumber = Math.max(Number(limit), 1);
                const skip = (pageNumber - 1) * limitNumber;
                // Get total count for pagination
                const totalNotifications = yield model_1.Notification.countDocuments(filters);
                // Fetch notifications with pagination, sorting, and population
                const notifications = yield model_1.Notification.find(filters)
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
            }
            catch (error) {
                throw new error_1.NotFoundError(`Failed to get notifications by userId: ${error.message}`);
            }
        });
    }
}
exports.NotificationService = NotificationService;
