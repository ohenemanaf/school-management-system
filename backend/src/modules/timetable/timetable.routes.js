const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const TimetableController = require('./timetable.controller');

const router = express.Router();
router.use(authenticateToken);

// Lecturers see their own slots and students their own class; enforced in the controller.
router.get('/', requirePermission('timetable.view'), TimetableController.getAll);
router.post('/', requirePermission('timetable.manage'), TimetableController.create);
router.delete('/:id', requirePermission('timetable.manage'), TimetableController.delete);

module.exports = router;
