const bcrypt = require('bcryptjs');
const LecturerModel = require('./lecturers.model');

class LecturerController {
    static async getAll(req, res) {
        try {
            const lecturers = await LecturerModel.findAll();
            res.json(lecturers);
        } catch (error) {
            console.error('Error fetching lecturers:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { email, password, department, hireDate } = req.body;
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            const id = await LecturerModel.create({ email, passwordHash, department, hireDate });
            res.status(201).json({ message: 'Lecturer created successfully', id });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email already exists' });
            }
            console.error('Error creating lecturer:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            const result = await LecturerModel.delete(req.params.id);
            if (!result) return res.status(404).json({ message: 'Lecturer not found' });
            res.json({ message: 'Lecturer deleted successfully' });
        } catch (error) {
            console.error('Error deleting lecturer:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const { email, department, hireDate } = req.body;
            // Note: Not handling password updates here to keep it simple, passwords can be reset via a different flow
            await LecturerModel.update(req.params.id, { email, department, hireDate });
            res.json({ message: 'Lecturer updated successfully' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email already exists' });
            }
            if (error.message === 'Lecturer not found') {
                return res.status(404).json({ message: 'Lecturer not found' });
            }
            console.error('Error updating lecturer:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
module.exports = LecturerController;
