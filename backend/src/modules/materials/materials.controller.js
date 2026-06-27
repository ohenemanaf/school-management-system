const MaterialsModel = require('./materials.model');

class MaterialsController {
    static async getAll(req, res) {
        try {
            const { role, id } = req.user;
            let materials;

            if (role === 'STUDENT') {
                const db = require('../../config/db');
                const [student] = await db.execute('SELECT id FROM students WHERE user_id = ?', [id]);
                if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
                materials = await MaterialsModel.findByStudent(student[0].id);
            } else {
                materials = await MaterialsModel.findAll();
            }

            res.json(materials);
        } catch (error) {
            console.error('Error fetching materials:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const id = await MaterialsModel.create(req.body);
            res.status(201).json({ message: 'Material uploaded successfully', id });
        } catch (error) {
            console.error('Error uploading material:', error);
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({ message: 'Invalid Group ID or Lecturer ID. Please ensure they exist.' });
            }
            res.status(500).json({ message: 'Server error' });
        }
    }
}
module.exports = MaterialsController;
