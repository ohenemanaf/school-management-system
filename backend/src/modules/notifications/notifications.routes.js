const express = require('express');
const router = express.Router();
const NotificationsController = require('./notifications.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

// All notification routes require authentication
router.use(authenticateToken);

// Get my notifications
router.get('/', NotificationsController.getMyNotifications);

// Mark single notification as read
router.put('/:id/read', NotificationsController.markAsRead);

// Mark all notifications as read
router.put('/read-all', NotificationsController.markAllAsRead);

// Admin only: Broadcast notification/email
router.post('/broadcast', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT']), NotificationsController.broadcast);

module.exports = router;
