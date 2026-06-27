const db = require('../../config/db');

class TimetableModel {
    static async findAll(filters = {}) {
        let query = `
            SELECT t.*, 
                   sg.name as student_group_name,
                   c.name as course_name, 
                   u.email as lecturer_email,
                   r.name as room_name
            FROM timetable_sessions t
            JOIN student_groups sg ON t.student_group_id = sg.id
            JOIN courses c ON t.course_id = c.id
            JOIN lecturers th ON t.lecturer_id = th.id
            JOIN users u ON th.user_id = u.id
            JOIN rooms r ON t.room_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.student_group_id) {
            query += ' AND t.student_group_id = ?';
            params.push(filters.student_group_id);
        }
        if (filters.lecturer_id) {
            query += ' AND t.lecturer_id = ?';
            params.push(filters.lecturer_id);
        }
        if (filters.room_id) {
            query += ' AND t.room_id = ?';
            params.push(filters.room_id);
        }

        query += ' ORDER BY FIELD(t.day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), t.start_time';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async checkOverlap(lecturerId, studentGroupId, roomId, dayOfWeek, startTime, endTime) {
        const query = `
            SELECT id FROM timetable_sessions 
            WHERE day_of_week = ? 
            AND (lecturer_id = ? OR student_group_id = ? OR room_id = ?)
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
        `;
        const [rows] = await db.execute(query, [
            dayOfWeek, lecturerId, studentGroupId, roomId,
            startTime, startTime,
            endTime, endTime,
            startTime, endTime
        ]);
        return rows.length > 0;
    }

    static async create(data) {
        const query = `
            INSERT INTO timetable_sessions (course_id, student_group_id, lecturer_id, room_id, day_of_week, start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [
            data.course_id, data.student_group_id, data.lecturer_id, data.room_id, data.day_of_week, data.start_time, data.end_time
        ]);
        return result.insertId;
    }

    static async delete(id) {
        const [result] = await db.execute('DELETE FROM timetable_sessions WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = TimetableModel;
