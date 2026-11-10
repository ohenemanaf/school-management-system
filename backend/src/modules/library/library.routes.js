const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const LibraryController = require('./library.controller');
const uploadLibraryPdf = require('../../core/middlewares/libraryUpload.middleware');

const router = express.Router();
router.use(authenticateToken);

router.get('/stats', requirePermission('library.stats'), LibraryController.getStats);

router.get('/books', requirePermission('library.view'), LibraryController.getAllBooks);
router.post('/books', requirePermission('library.manage'), uploadLibraryPdf.single('pdfFile'), LibraryController.createBook);
router.put('/books/:id', requirePermission('library.manage'), LibraryController.updateBook);
router.delete('/books/:id', requirePermission('library.manage'), LibraryController.deleteBook);

router.get('/assignments', requirePermission('library.classReading'), LibraryController.getClassAssignments);
router.post('/assignments', requirePermission('library.manage'), LibraryController.assignToClass);
router.delete('/assignments/:id', requirePermission('library.manage'), LibraryController.removeFromClass);

// Library managers see every loan; everyone else sees their own (controller).
router.get('/loans', requirePermission('library.view'), LibraryController.getAllLoans);
router.post('/loans/issue', requirePermission('library.manage'), LibraryController.issueBook);
router.put('/loans/:id/return', requirePermission('library.manage'), LibraryController.returnBook);

module.exports = router;
