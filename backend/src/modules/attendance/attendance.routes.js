const express = require('express');
const AttendanceController = require('./attendance.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/gate-token', requireRole(['SUPER_ADMIN', 'ADMIN', 'GATEKEEPER']), AttendanceController.generateGateToken);
router.post('/lecturer-checkin', requireRole(['LECTURER']), AttendanceController.lecturerCheckIn);
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']), AttendanceController.getAll);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'LECTURER']), AttendanceController.mark);

module.exports = router;
