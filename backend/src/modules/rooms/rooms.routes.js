const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const RoomsController = require('./rooms.controller');

const router = express.Router();
router.use(authenticateToken);

// Names are needed for dropdowns across the app, so any signed-in user may list them.
router.get('/', RoomsController.getAll);
router.post('/', requirePermission('academics.manage'), RoomsController.create);
router.put('/:id', requirePermission('academics.manage'), RoomsController.update);
router.delete('/:id', requirePermission('academics.manage'), RoomsController.delete);

module.exports = router;
