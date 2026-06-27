const db = require('../../config/db');

class NotificationsModel {
    static async createGlobal(title, message, type = 'INFO') {
        const [result] = await db.execute(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (NULL, ?, ?, ?)',
            [title, message, type]
        );
        return result.insertId;
    }

    static async createForRole(roleId, title, message, type = 'INFO') {
        // Insert a notification for every active user with the given role
        const [users] = await db.execute('SELECT id FROM users WHERE role_id = ? AND is_active = TRUE', [roleId]);
        if (users.length === 0) return 0;

        const values = users.map(u => `(${u.id}, ?, ?, ?)`).join(',');
        const params = [];
        users.forEach(() => {
            params.push(title, message, type);
        });

        const [result] = await db.execute(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ${values}`,
            params
        );
        return result.affectedRows;
    }

    static async createForUser(userId, title, message, type = 'INFO') {
        const [result] = await db.execute(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [userId, title, message, type]
        );
        return result.insertId;
    }

    static async getForUser(userId) {
        // Fetch personal notifications AND global notifications
        // Sort by created_at DESC
        const [rows] = await db.execute(
            `SELECT * FROM notifications 
             WHERE user_id = ? OR user_id IS NULL 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );
        return rows;
    }

    static async markAsRead(notificationId, userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return result.affectedRows > 0;
    }

    static async markAllAsRead(userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return result.affectedRows;
    }
}

module.exports = NotificationsModel;
