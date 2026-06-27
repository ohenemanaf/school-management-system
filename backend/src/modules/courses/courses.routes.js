const express = require('express');
const CoursesController = require('./courses.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', CoursesController.getAll);
router.post('/', requireRole(['ADMIN']), CoursesController.create);
router.delete('/:id', requireRole(['ADMIN']), CoursesController.delete);

module.exports = router;
