const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const CoursesController = require('./courses.controller');

const router = express.Router();
router.use(authenticateToken);

// Names are needed for dropdowns across the app, so any signed-in user may list them.
router.get('/', CoursesController.getAll);
router.post('/', requirePermission('academics.manage'), CoursesController.create);
router.delete('/:id', requirePermission('academics.manage'), CoursesController.delete);

module.exports = router;
