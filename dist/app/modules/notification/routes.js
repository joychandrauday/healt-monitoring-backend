"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const controller_1 = require("./controller");
const router = express_1.default.Router();
// Create a notification
router.post('/', controller_1.createNotification);
// Get a specific notification by ID
router.get('/:id', controller_1.getNotification);
// Get a specific notification by User ID
router.get('/user/:id', controller_1.getNotificationsByUserId);
// Get all notifications for the authenticated doctor
router.get('/', controller_1.getAllNotifications);
// Acknowledge a notification
router.patch('/:id/acknowledge', auth_1.authMiddleware, controller_1.acknowledgeNotification);
// Delete a specific notification
router.delete('/:id', auth_1.authMiddleware, controller_1.deleteNotification);
// Clear all notifications (optionally by type)
router.delete('/', controller_1.clearNotifications);
exports.notificationRoutes = router;
