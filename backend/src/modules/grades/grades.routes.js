const express = require('express');
const GradesController = require('./grades.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT']), GradesController.getAll);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'LECTURER']), GradesController.create);

module.exports = router;
