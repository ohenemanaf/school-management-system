const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const MaterialsController = require('./materials.controller');

const router = express.Router();
router.use(authenticateToken);

router.get('/', requirePermission('materials.view'), MaterialsController.getAll);
router.post('/', requirePermission('materials.manage'), MaterialsController.create);

module.exports = router;
