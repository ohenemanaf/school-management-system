const GradesModel = require('./grades.model');

class GradesController {
    static async getAll(req, res) {
        try {
            const { role, id } = req.user;
            let grades;

            if (role === 'STUDENT') {
                const db = require('../../config/db');
                const [student] = await db.execute('SELECT id FROM students WHERE user_id = ?', [id]);
                if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
                grades = await GradesModel.findByStudent(student[0].id);
            } else {
                grades = await GradesModel.findAll();
            }

            res.json(grades);
        } catch (error) {
            console.error('Error fetching grades:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const id = await GradesModel.create(req.body);
            res.status(201).json({ message: 'Grade saved successfully', id });
        } catch (error) {
            console.error('Error saving grade:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({ message: 'Invalid Group ID or Student ID. Please ensure they exist.' });
            }
            res.status(500).json({ message: 'Server error' });
        }
    }
}
module.exports = GradesController;
