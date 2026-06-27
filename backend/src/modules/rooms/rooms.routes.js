const express = require('express');
const router = express.Router();
const RoomsController = require('./rooms.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

router.get('/', authenticateToken, RoomsController.getAll);
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), RoomsController.create);
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), RoomsController.update);
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), RoomsController.delete);

module.exports = router;
