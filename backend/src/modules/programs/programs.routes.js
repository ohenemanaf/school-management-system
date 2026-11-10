const express = require('express');
const ProgramsController = require('./programs.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', ProgramsController.getAll);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), ProgramsController.create);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), ProgramsController.delete);

module.exports = router;
