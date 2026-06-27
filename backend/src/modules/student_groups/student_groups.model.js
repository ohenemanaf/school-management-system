const db = require('../../config/db');

class StudentGroupsModel {
    static async getAll() {
        const [rows] = await db.execute(`
            SELECT sg.*, p.name as program_name 
            FROM student_groups sg 
            LEFT JOIN programs p ON sg.program_id = p.id 
            ORDER BY sg.id ASC
        `);
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.execute('SELECT * FROM student_groups WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(name, level, program_id = null) {
        const [result] = await db.execute('INSERT INTO student_groups (name, level, program_id) VALUES (?, ?, ?)', [name, level, program_id]);
        return result.insertId;
    }

    static async update(id, name, level, program_id = null) {
        await db.execute('UPDATE student_groups SET name = ?, level = ?, program_id = ? WHERE id = ?', [name, level, program_id, id]);
    }

    static async delete(id) {
        await db.execute('DELETE FROM student_groups WHERE id = ?', [id]);
    }
}

module.exports = StudentGroupsModel;
