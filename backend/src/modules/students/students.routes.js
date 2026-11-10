const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const StudentController = require('./students.controller');
const StudentBulkController = require('./students.bulk.controller');
const uploadCsv = require('../../core/middlewares/csvUpload.middleware');
const uploadDisk = require('../../core/middlewares/upload.middleware');

const router = express.Router();
router.use(authenticateToken);

// Which fields each role sees, and a lecturer's own-classes scope, are applied in the controller.
router.get('/', requirePermission('students.view'), StudentController.getAll);
router.get('/:id', requirePermission('students.view'), StudentController.getOne);
router.post('/bulk-upload', requirePermission('students.manage'), uploadCsv.single('file'), StudentBulkController.uploadBulk);
router.post('/', requirePermission('students.manage'), uploadDisk.single('profileImage'), StudentController.create);
router.put('/:id', requirePermission('students.manage'), uploadDisk.single('profileImage'), StudentController.update);
router.delete('/:id', requirePermission('students.manage'), StudentController.delete);

module.exports = router;
