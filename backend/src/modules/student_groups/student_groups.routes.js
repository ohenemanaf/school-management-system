const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const StudentGroupsController = require('./student_groups.controller');

const router = express.Router();
router.use(authenticateToken);

// Names are needed for dropdowns across the app, so any signed-in user may list them.
router.get('/', StudentGroupsController.getAll);
router.post('/', requirePermission('academics.manage'), StudentGroupsController.create);
router.put('/:id', requirePermission('academics.manage'), StudentGroupsController.update);
router.delete('/:id', requirePermission('academics.manage'), StudentGroupsController.delete);

module.exports = router;
