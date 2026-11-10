const express = require('express');
const router = express.Router();
const LecturerAttendanceController = require('./lecturer_attendance.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

router.use(authenticateToken);

// Admin can see all records
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), LecturerAttendanceController.getAll);

// A lecturer sees only their own records
router.get('/me', requireRole(['LECTURER']), LecturerAttendanceController.getMine);

router.get('/:lecturerId', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), LecturerAttendanceController.getByLecturer);

// Lecturers record their own presence through the gate-token check-in, never directly
router.post('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), LecturerAttendanceController.mark);

module.exports = router;
