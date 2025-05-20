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
exports.getNotificationsByUserId = exports.clearNotifications = exports.deleteNotification = exports.acknowledgeNotification = exports.getAllNotifications = exports.getNotification = exports.createNotification = void 0;
const service_1 = require("./service");
const asyncHandler_1 = require("../../utils/asyncHandler");
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error");
const service_2 = require("../user/service");
const server_1 = require("../../../server");
const notificationService = new service_1.NotificationService();
const userService = new service_2.UserService();
exports.createNotification = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    const notification = yield notificationService.createNotification(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Notification created successfully',
        data: notification,
    });
}));
exports.getNotification = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const notification = yield notificationService.getNotificationById(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification retrieved successfully',
        data: notification,
    });
}));
exports.getAllNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!doctorId)
        throw new error_1.AppError('User not authenticated', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    const { notifications, meta } = yield notificationService.getAllNotifications(req.query, doctorId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notifications retrieved successfully',
        data: { notifications, meta },
    });
}));
exports.acknowledgeNotification = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const notification = yield notificationService.acknowledgeNotification(req.params.id, userId);
    const user = yield userService.getUserById(userId);
    let message = '';
    let url = '';
    switch (notification.type) {
        case 'vital':
            message = `Your vital submission has been acknowledged by Dr. ${(user === null || user === void 0 ? void 0 : user.name) || 'Doctor'}`;
            url = `/patient/vitals/${notification._id}`;
            break;
        case 'chat':
            message = `Your message has been acknowledged by Dr. ${(user === null || user === void 0 ? void 0 : user.name) || 'User'}`;
            url = `/chat/${notification.sender.toString()}`;
            break;
        case 'appointment':
            message = `Your appointment request has been acknowledged by Dr. ${(user === null || user === void 0 ? void 0 : user.name) || 'User'}`;
            url = `/patient/dashboard/appointments/${notification._id}`;
            break;
        default:
            message = `You have a new notification from Dr. ${(user === null || user === void 0 ? void 0 : user.name) || 'Doctor'}`;
            url = `/patient/dashboard/notifications/${notification._id}`;
            break;
    }
    const newPatientNotification = {
        receiver: notification.sender.toString(), // Doctor ID
        sender: notification.receiver.toString(), // Patient ID
        type: 'vital',
        message,
        url,
        timestamp: new Date(),
        acknowledged: false,
    };
    const savedNotification = yield notificationService.createNotification(newPatientNotification);
    // Emit the acknowledgment notification to the patient's room
    console.log('Emitting to room:', `patient:${newPatientNotification.receiver}`);
    server_1.io.to(`patient:${newPatientNotification.receiver}`).emit('notification:acknowledged', {
        sender: newPatientNotification.sender,
        notificationId: savedNotification._id,
        message: newPatientNotification.message,
        notification: Object.assign(Object.assign({}, savedNotification), { timestamp: savedNotification.timestamp.toISOString() }),
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification acknowledged successfully',
        data: notification,
    });
}));
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!doctorId)
        throw new error_1.AppError('User not authenticated', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    yield notificationService.deleteNotification(req.params.id, doctorId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.NO_CONTENT,
        success: true,
        message: 'Notification deleted successfully',
        data: null,
    });
}));
exports.clearNotifications = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const doctorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!doctorId)
        throw new error_1.AppError('User not authenticated', http_status_codes_1.StatusCodes.UNAUTHORIZED);
    const type = req.query.type;
    yield notificationService.clearNotifications(doctorId, type);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.NO_CONTENT,
        success: true,
        message: 'Notifications cleared successfully',
        data: null,
    });
}));
exports.getNotificationsByUserId = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    if (!userId) {
        throw new error_1.AppError('User ID is required', http_status_codes_1.StatusCodes.BAD_REQUEST);
    }
    const notifications = yield notificationService.getNotificationsByUserId(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
    });
}));
