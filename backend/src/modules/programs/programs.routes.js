const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const ProgramsController = require('./programs.controller');

const router = express.Router();
router.use(authenticateToken);

// Names are needed for dropdowns across the app, so any signed-in user may list them.
router.get('/', ProgramsController.getAll);
router.post('/', requirePermission('academics.manage'), ProgramsController.create);
router.delete('/:id', requirePermission('academics.manage'), ProgramsController.delete);

module.exports = router;
