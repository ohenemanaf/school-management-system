const db = require('../../config/db');

class MaterialsModel {
    static async findAll() {
        const [rows] = await db.execute(`
            SELECT m.id, m.title, m.file_url, m.created_at,
                   sg.name as student_group_name,
                   t.department as lecturer_dept
            FROM materials m
            JOIN student_groups sg ON m.student_group_id = sg.id
            JOIN lecturers t ON m.lecturer_id = t.id
            ORDER BY m.created_at DESC
        `);
        return rows;
    }

    static async findByStudent(studentId) {
        const [rows] = await db.execute(`
            SELECT m.id, m.title, m.file_url, m.created_at, sg.name as student_group_name
            FROM materials m
            JOIN student_groups sg ON m.student_group_id = sg.id
            ORDER BY m.created_at DESC
        `);
        return rows;
    }

    static async create(materialData) {
        const { studentGroupId, lecturerId, title, fileUrl } = materialData;
        const [result] = await db.execute(`
            INSERT INTO materials (student_group_id, lecturer_id, title, file_url) 
            VALUES (?, ?, ?, ?)
        `, [studentGroupId, lecturerId, title, fileUrl]);
        return result.insertId;
    }
}
module.exports = MaterialsModel;
