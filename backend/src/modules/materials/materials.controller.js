const MaterialsModel = require('./materials.model');
const db = require('../../config/db');
const { lecturerIdFor, groupScopeFor, inScope } = require('../../utils/currentProfile');
const { signFields } = require('../../utils/signedUploads');

class MaterialsController {
    static async getAll(req, res) {
        try {
            const { role, id } = req.user;
            let materials;

            if (role === 'STUDENT') {
                const [student] = await db.execute('SELECT student_group_id FROM students WHERE user_id = ?', [id]);
                const groupId = student[0]?.student_group_id;
                materials = groupId ? await MaterialsModel.findByGroup(groupId) : [];
            } else {
                materials = await MaterialsModel.findAll({ scope: await groupScopeFor(req.user) });
            }

            res.json(signFields(materials, 'file_url'));
        } catch (error) {
            console.error('Error fetching materials:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { studentGroupId, title, fileUrl } = req.body;
            let { lecturerId } = req.body;
            if (req.user.role === 'LECTURER') {
                // Lecturers always publish as themselves.
                lecturerId = await lecturerIdFor(req.user.id);
                if (!lecturerId) return res.status(404).json({ message: 'Lecturer profile not found' });
            }
            if (studentGroupId && !inScope(await groupScopeFor(req.user), studentGroupId)) {
                return res.status(403).json({ message: 'You can only share materials with the classes you teach' });
            }
            if (!studentGroupId || !lecturerId || !title || typeof fileUrl !== 'string' || !/^(https?:\/\/|\/uploads\/)/i.test(fileUrl)) {
                return res.status(400).json({ message: 'Group, lecturer, title and an http(s) link are required' });
            }
            const id = await MaterialsModel.create({ studentGroupId, lecturerId, title, fileUrl });
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
