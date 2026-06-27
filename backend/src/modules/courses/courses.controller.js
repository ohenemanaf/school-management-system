const db = require('../../config/db');

class CoursesController {
    static async getAll(req, res) {
        try {
            const [rows] = await db.execute('SELECT * FROM courses');
            res.json(rows);
        } catch (error) {
            console.error('Error fetching courses:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { name, code } = req.body;
            const [result] = await db.execute('INSERT INTO courses (name, code) VALUES (?, ?)', [name, code]);
            res.status(201).json({ message: 'Course created successfully', id: result.insertId });
        } catch (error) {
            console.error('Error creating course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Course not found' });
            res.json({ message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = CoursesController;
