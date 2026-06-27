const db = require('../../config/db');

class AttendanceModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT a.id, a.date, a.status, 
                   s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN student_groups sg ON a.student_group_id = sg.id
            ORDER BY a.date DESC
        `);
        return rows;
    }

    static async findByStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT a.id, a.date, a.status, sg.name as student_group_name
            FROM attendance a
            JOIN student_groups sg ON a.student_group_id = sg.id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        `, [studentId]);
        return rows;
    }

    static async mark(studentId, studentGroupId, date, status) {
        const [result] = await db.execute(`
            INSERT INTO attendance (student_id, student_group_id, date, status) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [studentId, studentGroupId, date, status]);
        return result.insertId || result.affectedRows;
    }

    static async getValidToken() {
        // Return a token that is unused and not expired
        const [rows] = await db.execute(`
            SELECT token FROM gate_tokens
            WHERE is_used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        `);
        return rows.length ? rows[0].token : null;
    }

    static async createToken(tokenStr) {
        // 5 minute expiry
        await db.execute(`
            INSERT INTO gate_tokens (token, expires_at)
            VALUES (?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
        `, [tokenStr]);
        return tokenStr;
    }

    static async validateAndConsumeToken(tokenStr) {
        // Find if valid and unused
        const [rows] = await db.execute(`
            SELECT id FROM gate_tokens
            WHERE token = ? AND is_used = FALSE AND expires_at > NOW()
        `, [tokenStr]);
        
        if (rows.length === 0) return false;

        // Consume it
        await db.execute('UPDATE gate_tokens SET is_used = TRUE WHERE id = ?', [rows[0].id]);
        return true;
    }
}
module.exports = AttendanceModel;
