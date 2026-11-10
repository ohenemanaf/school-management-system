const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const UserController = require('./users.controller');
const { loginLimiter, registerLimiter } = require('../../core/middlewares/rateLimit.middleware');

const router = express.Router();

router.post('/register', registerLimiter, UserController.register);
router.post('/login', loginLimiter, UserController.login);

// Any signed-in account
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/preferences', authenticateToken, UserController.updatePreferences);
router.put('/security/password', authenticateToken, UserController.updatePassword);

// Accounts and roles belong to the super admin alone
router.get('/', authenticateToken, requirePermission('users.manage'), UserController.getAll);
router.put('/:id', authenticateToken, requirePermission('users.manage'), UserController.update);
router.delete('/:id', authenticateToken, requirePermission('users.manage'), UserController.delete);

module.exports = router;
