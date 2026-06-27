const StudentGroupsModel = require('./student_groups.model');

class StudentGroupsController {
    static async getAll(req, res) {
        try {
            const groups = await StudentGroupsModel.getAll();
            res.json(groups);
        } catch (error) {
            console.error('Error fetching student groups:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { name, level, program_id } = req.body;
            if (!name || !level) return res.status(400).json({ message: 'Name and level are required' });

            const id = await StudentGroupsModel.create(name, level, program_id || null);
            res.status(201).json({ id, name, level, program_id: program_id || null });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Student group name already exists' });
            }
            console.error('Error creating student group:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const { name, level, program_id } = req.body;
            await StudentGroupsModel.update(req.params.id, name, level, program_id || null);
            res.json({ message: 'Student group updated' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Student group name already exists' });
            }
            console.error('Error updating student group:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            await StudentGroupsModel.delete(req.params.id);
            res.json({ message: 'Student group deleted' });
        } catch (error) {
            console.error('Error deleting student group:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = StudentGroupsController;
