const express = require('express');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');
const { DashboardController } = require('./dashboard.controller');

const router = express.Router();
router.use(authenticateToken);

// One endpoint; the server decides which sections each role receives.
router.get('/', DashboardController.get);

module.exports = router;
