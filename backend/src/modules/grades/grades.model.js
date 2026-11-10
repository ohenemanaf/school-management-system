const db = require('../../config/db');

class GradesModel {
    /** Most recent grades first, optionally for one group. Always capped. */
    static async findAll({ studentGroupId, limit } = {}) {
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 2000);
        const params = [];
        let where = '';
        if (studentGroupId) {
            where = 'WHERE g.student_group_id = ?';
            params.push(studentGroupId);
        }
        const [rows] = await db.execute(`
            SELECT g.id, g.assessment_name, g.score, g.max_score, g.created_at,
                   s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN student_groups sg ON g.student_group_id = sg.id
            ${where}
            ORDER BY g.created_at DESC, g.id DESC
            LIMIT ${safeLimit}`, params);
        return rows;
    }

    static async findByStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT g.id, g.assessment_name, g.score, g.max_score, g.created_at, sg.name as student_group_name
            FROM grades g
            JOIN student_groups sg ON g.student_group_id = sg.id
            WHERE g.student_id = ?
            ORDER BY g.created_at DESC
        `, [studentId]);
        return rows;
    }

    static async create(gradeData) {
        const { studentId, studentGroupId, assessmentName, score, maxScore } = gradeData;
        const [result] = await db.execute(`
            INSERT INTO grades (student_id, student_group_id, assessment_name, score, max_score) 
            VALUES (?, ?, ?, ?, ?)
        `, [studentId, studentGroupId, assessmentName, score, maxScore]);
        return result.insertId;
    }
}
module.exports = GradesModel;
