const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const AttendanceController = require('./attendance.controller');
const { checkInLimiter } = require('../../core/middlewares/rateLimit.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/gate-token', requirePermission('gate.code'), AttendanceController.generateGateToken);
router.post('/lecturer-checkin', requirePermission('staffAttendance.checkIn'), checkInLimiter, AttendanceController.lecturerCheckIn);
// Lecturers are limited to the classes they teach; students to their own record.
router.get('/', requirePermission('attendance.view'), AttendanceController.getAll);
router.post('/', requirePermission('attendance.record'), AttendanceController.mark);
router.post('/bulk', requirePermission('attendance.record'), AttendanceController.markBulk);

module.exports = router;
