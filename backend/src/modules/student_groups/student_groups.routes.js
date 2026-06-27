const express = require('express');
const router = express.Router();
const StudentGroupsController = require('./student_groups.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

router.get('/', authenticateToken, StudentGroupsController.getAll);
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), StudentGroupsController.create);
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), StudentGroupsController.update);
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), StudentGroupsController.delete);

module.exports = router;
