const express = require('express');
const UserController = require('./users.controller');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');
const { requireRole } = require('../../core/middlewares/role.middleware');

const router = express.Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Protected routes
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/preferences', authenticateToken, UserController.updatePreferences);
router.put('/security/password', authenticateToken, UserController.updatePassword);

// Admin routes for User Management
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'ADMIN']), UserController.getAll);
router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), UserController.update);
router.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN']), UserController.delete);

module.exports = router;
