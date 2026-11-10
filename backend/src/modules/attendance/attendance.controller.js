const crypto = require('crypto');
const AttendanceModel = require('./attendance.model');
const LecturerAttendanceModel = require('../lecturer_attendance/lecturer_attendance.model');
const { lecturerIdFor } = require('../../utils/currentProfile');
const { localDate, localTime } = require('../../utils/dates');

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
                const db = require('../../config/db');
                const [student] = await db.execute('SELECT id FROM students WHERE user_id = ?', [id]);
                if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
                attendance = await AttendanceModel.findByStudent(student[0].id);
            } else {
                attendance = await AttendanceModel.findAll();
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
