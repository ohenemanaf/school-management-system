const db = require('../../config/db');

class NotificationsModel {
    static async createGlobal(title, message, type = 'INFO') {
        const [result] = await db.execute(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (NULL, ?, ?, ?)',
            [title, message, type]
        );
        return result.insertId;
    }

    /** One row per active user with the role, written by a single INSERT ... SELECT. */
    static async createForRole(roleId, title, message, type = 'INFO') {
        const [result] = await db.execute(
            `INSERT INTO notifications (user_id, title, message, type)
             SELECT id, ?, ?, ? FROM users WHERE role_id = ? AND is_active = TRUE`,
            [title, message, type, roleId]
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

    /**
     * Latest 50 personal and school-wide notifications. Each half uses its own index
     * (an OR across both would scan the table); read state for school-wide items
     * comes from the per-user notification_reads table.
     */
    static async getForUser(userId) {
        const [rows] = await db.execute(
            `SELECT n.id, n.user_id, n.title, n.message, n.type, n.created_at,
                    (n.is_read OR r.user_id IS NOT NULL) AS is_read
             FROM (
                 (SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50)
                 UNION ALL
                 (SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50)
             ) n
             LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId, userId]
        );
        return rows;
    }

    static async markAsRead(notificationId, userId) {
        const [personal] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        if (personal.affectedRows > 0) return true;

        const [global] = await db.execute(
            `INSERT IGNORE INTO notification_reads (notification_id, user_id)
             SELECT id, ? FROM notifications WHERE id = ? AND user_id IS NULL`,
            [userId, notificationId]
        );
        return global.affectedRows > 0;
    }

    static async markAllAsRead(userId) {
        const [personal] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        const [global] = await db.execute(
            `INSERT IGNORE INTO notification_reads (notification_id, user_id)
             SELECT id, ? FROM notifications WHERE user_id IS NULL`,
            [userId]
        );
        return personal.affectedRows + global.affectedRows;
    }
}

module.exports = NotificationsModel;
