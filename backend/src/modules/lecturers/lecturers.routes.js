const express = require('express');
const LecturerController = require('./lecturers.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

const LecturerBulkController = require('./lecturers.bulk.controller');
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);
router.post('/bulk-upload', requireRole(['SUPER_ADMIN', 'ADMIN']), uploadMemory.single('file'), LecturerBulkController.uploadBulk);
router.get('/', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']), LecturerController.getAll);
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), LecturerController.create);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), LecturerController.update);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), LecturerController.delete);

module.exports = router;

