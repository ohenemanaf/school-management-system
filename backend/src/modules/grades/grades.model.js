const db = require('../../config/db');

class GradesModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT g.id, g.assessment_name, g.score, g.max_score,
                   s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN student_groups sg ON g.student_group_id = sg.id
            ORDER BY g.created_at DESC
        `);
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
