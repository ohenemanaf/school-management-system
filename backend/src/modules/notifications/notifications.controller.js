const NotificationsModel = require('./notifications.model');
const emailService = require('../../utils/emailService');
const db = require('../../config/db');

class NotificationsController {
    static async getMyNotifications(req, res) {
        try {
            const { id } = req.user;
            const notifications = await NotificationsModel.getForUser(id);
            res.json(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ message: 'Server error fetching notifications' });
        }
    }

    static async markAsRead(req, res) {
        try {
            const { id } = req.user;
            const notificationId = req.params.id;
            
            const success = await NotificationsModel.markAsRead(notificationId, id);
            if (!success) {
                // Could be it doesn't exist, already read, or it's a global notification
                // For global notifications, since we don't have a read-receipt table, we can just return success anyway
                // to make the frontend happy.
            }
            res.json({ message: 'Notification marked as read' });
        } catch (error) {
            console.error('Error marking notification read:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async markAllAsRead(req, res) {
        try {
            const { id } = req.user;
            await NotificationsModel.markAllAsRead(id);
            res.json({ message: 'All notifications marked as read' });
        } catch (error) {
            console.error('Error marking all notifications read:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async broadcast(req, res) {
        try {
            const { title, message, type, audience, sendEmail } = req.body;
            
            if (!title || !message || !audience) {
                return res.status(400).json({ message: 'Title, message, and audience are required' });
            }

            let recipients = [];
            
            if (audience === 'ALL') {
                await NotificationsModel.createGlobal(title, message, type || 'INFO');
                if (sendEmail) {
                    const [users] = await db.execute('SELECT email FROM users WHERE is_active = TRUE');
                    recipients = users.map(u => u.email);
                }
            } else {
                // Audience should be a role like 'STUDENT', 'LECTURER', 'ADMIN'
                const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [audience]);
                if (roles.length === 0) {
                    return res.status(400).json({ message: 'Invalid audience role' });
                }
                const roleId = roles[0].id;
                
                await NotificationsModel.createForRole(roleId, title, message, type || 'INFO');
                
                if (sendEmail) {
                    const [users] = await db.execute('SELECT email FROM users WHERE role_id = ? AND is_active = TRUE', [roleId]);
                    recipients = users.map(u => u.email);
                }
            }

            if (sendEmail && recipients.length > 0) {
                // Fire and forget email
                emailService.sendBulkNotification(recipients, title, message);
            }

            res.status(201).json({ message: 'Broadcast sent successfully', emailCount: recipients.length });
        } catch (error) {
            console.error('Error sending broadcast:', error);
            res.status(500).json({ message: 'Server error broadcasting notification' });
        }
    }
}

module.exports = NotificationsController;
