const GradesModel = require('./grades.model');
const db = require('../../config/db');
const { groupScopeFor, inScope } = require('../../utils/currentProfile');

const COMPONENTS = ['CLASS', 'EXAM'];

/** Subjects this lecturer teaches the class (from the timetable). */
async function subjectsTaught(userId, studentGroupId) {
    const [rows] = await db.execute(
        `SELECT DISTINCT c.id, c.name, c.code
         FROM timetable_sessions ts
         JOIN lecturers l ON l.id = ts.lecturer_id
         JOIN courses c ON c.id = ts.course_id
         WHERE l.user_id = ? AND ts.student_group_id = ?
         ORDER BY c.name`,
        [userId, studentGroupId]
    );
    return rows;
}

async function currentTerm() {
    const [rows] = await db.execute('SELECT id, name FROM terms WHERE is_current = 1 LIMIT 1');
    return rows[0] || null;
}

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

    /** What the grade form needs: the current term and the subjects this lecturer teaches the class. */
    static async options(req, res) {
        try {
            const groupId = Number(req.query.student_group_id);
            if (!Number.isInteger(groupId) || groupId <= 0) return res.status(400).json({ message: 'Choose a class.' });
            if (!inScope(await groupScopeFor(req.user), groupId)) {
                return res.status(403).json({ message: 'You can only grade the classes you teach' });
            }
            res.json({ term: await currentTerm(), subjects: await subjectsTaught(req.user.id, groupId) });
        } catch (error) {
            console.error('Error loading grade options:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { studentId, studentGroupId, assessmentName } = req.body;
            const courseId = Number(req.body.courseId);
            const component = req.body.component || 'CLASS';
            const score = Number(req.body.score);
            const maxScore = Number(req.body.maxScore);
            if (!studentId || !studentGroupId || !assessmentName) {
                return res.status(400).json({ message: 'Student, group and assessment name are required' });
            }
            if (!Number.isInteger(courseId) || courseId <= 0 || !COMPONENTS.includes(component)) {
                return res.status(400).json({ message: 'Choose the subject and whether this is class work or an exam' });
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
            if (!(await subjectsTaught(req.user.id, studentGroupId)).some((s) => s.id === courseId)) {
                return res.status(403).json({ message: 'You can only grade subjects you teach this class' });
            }
            const term = await currentTerm();
            if (!term) return res.status(400).json({ message: 'Ask an administrator to set the current term first.' });
            const id = await GradesModel.create({ studentId, studentGroupId, assessmentName, score, maxScore, courseId, termId: term.id, component });
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
