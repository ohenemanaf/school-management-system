const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const LecturerAttendanceController = require('./lecturer_attendance.controller');

const router = express.Router();
router.use(authenticateToken);

router.get('/', requirePermission('staffAttendance.view'), LecturerAttendanceController.getAll);
router.get('/me', requirePermission('staffAttendance.checkIn'), LecturerAttendanceController.getMine);
router.get('/:lecturerId', requirePermission('staffAttendance.view'), LecturerAttendanceController.getByLecturer);
// Lecturers record their own presence through the gate-token check-in, never directly.
router.post('/', requirePermission('staffAttendance.manage'), LecturerAttendanceController.mark);

module.exports = router;
