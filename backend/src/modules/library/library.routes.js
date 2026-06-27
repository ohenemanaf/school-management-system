const express = require('express');
const router = express.Router();
const LibraryController = require('./library.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');
const uploadLibraryPdf = require('../../core/middlewares/libraryUpload.middleware');

router.use(authenticateToken);

// === STATS ===
router.get('/stats', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LIBRARIAN']), LibraryController.getStats);

// === BOOKS ===
// Everyone can view books (Students and Lecturers can search the catalog)
router.get('/books', LibraryController.getAllBooks);
router.post('/books', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), uploadLibraryPdf.single('pdfFile'), LibraryController.createBook);
router.put('/books/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.updateBook);
router.delete('/books/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.deleteBook);

// === CLASS ASSIGNMENTS ===
router.get('/assignments', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN', 'STUDENT']), LibraryController.getClassAssignments);
router.post('/assignments', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.assignToClass);
router.delete('/assignments/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.removeFromClass);

// === LOANS ===
// Controller filters logic: Students/Lecturers only see their own loans
router.get('/loans', LibraryController.getAllLoans);
router.post('/loans/issue', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.issueBook);
router.put('/loans/:id/return', requireRole(['SUPER_ADMIN', 'ADMIN', 'LIBRARIAN']), LibraryController.returnBook);

module.exports = router;
