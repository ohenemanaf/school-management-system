const express = require('express');
const router = express.Router();
const LecturerAttendanceController = require('./lecturer_attendance.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

router.use(authenticateToken);

// Admin can see all records
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), LecturerAttendanceController.getAll);

// Admin and the specific lecturer can see lecturer's records
router.get('/:lecturerId', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']), LecturerAttendanceController.getByLecturer);

// Admin and Lecturer can mark attendance (e.g. clock in)
router.post('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']), LecturerAttendanceController.mark);

module.exports = router;
