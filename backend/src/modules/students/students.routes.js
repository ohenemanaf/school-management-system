const express = require('express');
const StudentController = require('./students.controller');
const StudentBulkController = require('./students.bulk.controller');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');
const { requireRole } = require('../../core/middlewares/role.middleware');

const router = express.Router();

// All student routes require authentication
router.use(authenticateToken);

const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });
const uploadDisk = require('../../core/middlewares/upload.middleware');

// Admin and Lecturer can view all students
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'ACCOUNTANT']), StudentController.getAll);

// Only Admin can create, update, or delete students
// Write routes (Restricted to Admins)
router.post('/bulk-upload', requireRole(['SUPER_ADMIN', 'ADMIN']), uploadMemory.single('file'), StudentBulkController.uploadBulk);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), uploadDisk.single('profileImage'), StudentController.create);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), uploadDisk.single('profileImage'), StudentController.update);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), StudentController.delete);
router.get('/:id', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']), StudentController.getOne);

module.exports = router;
