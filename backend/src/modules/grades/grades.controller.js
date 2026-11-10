const GradesModel = require('./grades.model');
const db = require('../../config/db');
const { groupScopeFor, inScope } = require('../../utils/currentProfile');

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
                // Only the teaching lecturer reaches this branch (see grades.routes.js).
                const scope = await groupScopeFor(req.user);
                if (req.query.student_group_id && !inScope(scope, req.query.student_group_id)) {
                    return res.status(403).json({ message: 'You can only view grades for the classes you teach' });
                }
                grades = await GradesModel.findAll({ studentGroupId: req.query.student_group_id, limit: req.query.limit, scope });
            }

            res.json(grades);
        } catch (error) {
            console.error('Error fetching grades:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async analytics(req, res) {
        try {
            res.json(await GradesModel.analytics());
        } catch (error) {
            console.error('Error building grade analytics:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { studentId, studentGroupId, assessmentName } = req.body;
            const score = Number(req.body.score);
            const maxScore = Number(req.body.maxScore);
            if (!studentId || !studentGroupId || !assessmentName) {
                return res.status(400).json({ message: 'Student, group and assessment name are required' });
            }
            if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
                return res.status(400).json({ message: 'Score must be between 0 and the maximum score' });
            }
            if (!inScope(await groupScopeFor(req.user), studentGroupId)) {
                return res.status(403).json({ message: 'You can only grade the classes you teach' });
            }
            const [member] = await db.execute('SELECT id FROM students WHERE id = ? AND student_group_id = ?', [studentId, studentGroupId]);
            if (member.length === 0) {
                return res.status(400).json({ message: 'That student is not in the selected group' });
            }
            const id = await GradesModel.create({ studentId, studentGroupId, assessmentName, score, maxScore });
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
