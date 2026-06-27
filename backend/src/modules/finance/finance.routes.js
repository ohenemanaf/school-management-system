const express = require('express');
const router = express.Router();
const FinanceController = require('./finance.controller');
const { authenticateToken, requireRole } = require('../../core/middlewares/auth.middleware');

router.use(authenticateToken);

// === DASHBOARD STATS ===
router.get('/stats', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT']), FinanceController.getStats);

// === FEE TYPES ===
router.get('/fee-types', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT']), FinanceController.getFeeTypes);
router.post('/fee-types', requireRole(['SUPER_ADMIN', 'ACCOUNTANT', 'ADMIN']), FinanceController.createFeeType);
router.put('/fee-types/:id', requireRole(['SUPER_ADMIN', 'ACCOUNTANT', 'ADMIN']), FinanceController.updateFeeType);

// === INVOICES ===
// Students can view their own invoices, admins can view all
router.get('/invoices', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT', 'STUDENT']), FinanceController.getInvoices);
router.post('/invoices', requireRole(['SUPER_ADMIN', 'ACCOUNTANT', 'ADMIN']), FinanceController.createInvoice);

// === DEFAULTERS ===
router.get('/defaulters', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT']), FinanceController.getDefaulters);

// === PAYMENTS ===
router.get('/payments/:invoiceId', requireRole(['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT', 'STUDENT']), FinanceController.getPayments);
router.post('/payments', requireRole(['SUPER_ADMIN', 'ACCOUNTANT', 'ADMIN']), FinanceController.recordPayment);

module.exports = router;
