const db = require('../../config/db');

class LecturerAttendanceModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT a.*, t.department, u.email, u.is_active
            FROM lecturer_attendance a
            JOIN lecturers t ON a.lecturer_id = t.id
            JOIN users u ON t.user_id = u.id
            ORDER BY a.date DESC
        `);
        return rows;
    }

    static async findByLecturerId(lecturerId) {
        const [rows] = await db.execute(`
            SELECT * FROM lecturer_attendance
            WHERE lecturer_id = ?
            ORDER BY date DESC
        `, [lecturerId]);
        return rows;
    }

    static async markAttendance(lecturerId, date, status, checkInTime, checkOutTime) {
        // Use REPLACE INTO or INSERT ... ON DUPLICATE KEY UPDATE to allow easy updates
        const [result] = await db.execute(`
            INSERT INTO lecturer_attendance (lecturer_id, date, status, check_in_time, check_out_time)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            status = VALUES(status), check_in_time = VALUES(check_in_time), check_out_time = VALUES(check_out_time)
        `, [lecturerId, date, status, checkInTime || null, checkOutTime || null]);
        return result.insertId || result.affectedRows;
    }
}

module.exports = LecturerAttendanceModel;
