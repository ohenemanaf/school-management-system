const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const GradesController = require('./grades.controller');

const router = express.Router();
router.use(authenticateToken);

// Named grades: the teaching lecturer and the student themself. Everyone else gets analytics.
router.get('/analytics', requirePermission('grades.analytics'), GradesController.analytics);
router.get('/options', requirePermission('grades.record'), GradesController.options);
router.get('/', requirePermission('grades.view'), GradesController.getAll);
router.post('/', requirePermission('grades.record'), GradesController.create);

module.exports = router;
