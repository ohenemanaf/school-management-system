const express = require('express');
const StatsController = require('./stats.controller');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', StatsController.getDashboardStats);

module.exports = router;
