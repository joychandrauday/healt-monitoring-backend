import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
    createNotification,
    getNotification,
    getAllNotifications,
    acknowledgeNotification,
    deleteNotification,
    clearNotifications,
    getNotificationsByUserId
} from './controller';

const router = express.Router();

// Create a notification
router.post('/', createNotification);

// Get a specific notification by ID
router.get('/:id', getNotification);

// Get a specific notification by User ID
router.get('/user/:id', getNotificationsByUserId);

// Get all notifications for the authenticated doctor
router.get('/', getAllNotifications);

// Acknowledge a notification
router.patch('/:id/acknowledge', authMiddleware, acknowledgeNotification);

// Delete a specific notification
router.delete('/:id', authMiddleware, deleteNotification);

// Clear all notifications (optionally by type)
router.delete('/', clearNotifications);

export const notificationRoutes = router;