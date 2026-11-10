const express = require('express');
const StatsController = require('./stats.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), StatsController.getDashboardStats);

module.exports = router;
