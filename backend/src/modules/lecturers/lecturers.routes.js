const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const LecturerController = require('./lecturers.controller');
const LecturerBulkController = require('./lecturers.bulk.controller');
const uploadCsv = require('../../core/middlewares/csvUpload.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/', requirePermission('lecturers.view'), LecturerController.getAll);
router.post('/bulk-upload', requirePermission('lecturers.manage'), uploadCsv.single('file'), LecturerBulkController.uploadBulk);
router.post('/', requirePermission('lecturers.manage'), LecturerController.create);
router.put('/:id', requirePermission('lecturers.manage'), LecturerController.update);
router.delete('/:id', requirePermission('lecturers.manage'), LecturerController.delete);

module.exports = router;
