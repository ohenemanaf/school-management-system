const express = require('express');
const TimetableController = require('./timetable.controller');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');
const { requireRole } = require('../../core/middlewares/role.middleware');

const router = express.Router();

router.use(authenticateToken);

// All users can view timetables (We restrict strictly to the 5 roles that need to see it)
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT']), TimetableController.getAll);

// Only ADMIN can create or delete timetable slots
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), TimetableController.create);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), TimetableController.delete);

module.exports = router;
