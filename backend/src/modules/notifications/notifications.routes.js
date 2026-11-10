const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const NotificationsController = require('./notifications.controller');

const router = express.Router();
router.use(authenticateToken);

// Everyone reads their own notifications
router.get('/', NotificationsController.getMyNotifications);
router.put('/read-all', NotificationsController.markAllAsRead);
router.put('/:id/read', NotificationsController.markAsRead);

// The accountant may only address students; the audience check is in the controller.
router.post('/broadcast', requirePermission('broadcast.send'), NotificationsController.broadcast);

module.exports = router;
