const crypto = require('crypto');
const AttendanceModel = require('./attendance.model');
const LecturerAttendanceModel = require('../lecturer_attendance/lecturer_attendance.model');
const { lecturerIdFor, studentIdFor, groupScopeFor, inScope } = require('../../utils/currentProfile');

const notYourClass = (res) => res.status(403).json({ message: 'You can only take attendance for the classes you teach' });
const { localDate, localTime } = require('../../utils/dates');

const STATUSES = ['Present', 'Absent', 'Late'];
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
const TOKEN_LENGTH = 6;

function randomToken() {
    let token = '';
    for (let i = 0; i < TOKEN_LENGTH; i++) token += TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)];
    return token;
}

class AttendanceController {
    static async getAll(req, res) {
        try {
            const { role, id } = req.user;
            let attendance;

            if (role === 'STUDENT') {
                const studentId = await studentIdFor(id);
                if (!studentId) return res.status(404).json({ message: 'Student not found' });
                attendance = await AttendanceModel.findByStudent(studentId);
            } else {
                const scope = await groupScopeFor(req.user);
                if (req.query.student_group_id && !inScope(scope, req.query.student_group_id)) return notYourClass(res);
                attendance = await AttendanceModel.findAll({
                    scope,
                    studentGroupId: req.query.student_group_id,
                    date: req.query.date,
                    limit: req.query.limit,
                });
            }

            res.json(attendance);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async mark(req, res) {
        try {
            const { studentId, studentGroupId, date, status } = req.body;
            if (!studentId || !studentGroupId || !date || !STATUSES.includes(status)) {
                return res.status(400).json({ message: `studentId, studentGroupId, date and a status of ${STATUSES.join(', ')} are required` });
            }
            if (!inScope(await groupScopeFor(req.user), studentGroupId)) return notYourClass(res);
            await AttendanceModel.mark(studentId, studentGroupId, date, status);
            res.json({ message: 'Attendance marked successfully' });
        } catch (error) {
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({ message: 'Invalid Group ID or Student ID. Please ensure they exist.' });
            }
            console.error('Error marking attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async markBulk(req, res) {
        try {
            const { studentGroupId, date, records } = req.body;
            if (!studentGroupId || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ message: 'studentGroupId and a date (YYYY-MM-DD) are required' });
            }
            if (!Array.isArray(records) || records.length === 0 || records.length > 1000) {
                return res.status(400).json({ message: 'records must list between 1 and 1000 students' });
            }
            if (records.some((r) => !r || !Number.isInteger(Number(r.studentId)) || !STATUSES.includes(r.status))) {
                return res.status(400).json({ message: `Each record needs a studentId and a status of ${STATUSES.join(', ')}` });
            }
            if (!inScope(await groupScopeFor(req.user), studentGroupId)) return notYourClass(res);
            const result = await AttendanceModel.markBulk(studentGroupId, date, records);
            res.json({ message: 'Attendance saved', ...result });
        } catch (error) {
            console.error('Error saving bulk attendance:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async generateGateToken(req, res) {
        try {
            let token = await AttendanceModel.getValidToken();
            for (let attempt = 0; !token && attempt < 5; attempt++) {
                try {
                    token = await AttendanceModel.createToken(randomToken());
                } catch (error) {
                    if (error.code !== 'ER_DUP_ENTRY') throw error; // collision: try another
                }
            }
            if (!token) throw new Error('Could not generate a unique gate token');
            res.json({ token });
        } catch (error) {
            console.error('Error generating gate token:', error);
            res.status(500).json({ message: 'Server error generating token' });
        }
    }

    static async lecturerCheckIn(req, res) {
        try {
            const { token } = req.body;
            if (typeof token !== 'string' || !token.trim()) return res.status(400).json({ message: 'Token is required' });

            // Resolve the profile first so a misconfigured account does not burn the token.
            const lecturerId = await lecturerIdFor(req.user.id);
            if (!lecturerId) return res.status(404).json({ message: 'Lecturer profile not found' });

            const consumed = await AttendanceModel.consumeToken(token.trim().toUpperCase());
            if (!consumed) {
                return res.status(400).json({ message: 'Invalid, used, or expired token' });
            }

            await LecturerAttendanceModel.markAttendance(lecturerId, localDate(), 'Present', localTime(), null);
            
            res.json({ message: 'Check-in successful' });
        } catch (error) {
            console.error('Error during lecturer check-in:', error);
            res.status(500).json({ message: 'Server error during check-in' });
        }
    }
}
module.exports = AttendanceController;
