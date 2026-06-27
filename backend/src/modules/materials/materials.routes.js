const express = require('express');
const MaterialsController = require('./materials.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT']), MaterialsController.getAll);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'LECTURER', 'LIBRARIAN']), MaterialsController.create);

module.exports = router;
