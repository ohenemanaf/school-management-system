const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const StatsController = require('./stats.controller');

const router = express.Router();
router.use(authenticateToken);
router.get('/', requirePermission('dashboard.stats'), StatsController.getDashboardStats);

module.exports = router;
