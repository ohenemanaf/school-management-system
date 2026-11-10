const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const FinanceController = require('./finance.controller');

const router = express.Router();
router.use(authenticateToken);

// Totals only
router.get('/stats', requirePermission('finance.summary'), FinanceController.getStats);

// Viewing records (admin can see who has paid, but cannot change anything)
router.get('/fee-types', requirePermission('finance.records'), FinanceController.getFeeTypes);
router.get('/defaulters', requirePermission('finance.records'), FinanceController.getDefaulters);
router.get('/invoices', requirePermission('finance.records', 'finance.own'), FinanceController.getInvoices);
router.get('/payments/:invoiceId', requirePermission('finance.records', 'finance.own'), FinanceController.getPayments);

// Changing records: the accountant (and super admin)
router.post('/fee-types', requirePermission('finance.manage'), FinanceController.createFeeType);
router.put('/fee-types/:id', requirePermission('finance.manage'), FinanceController.updateFeeType);
router.post('/invoices', requirePermission('finance.manage'), FinanceController.createInvoice);
router.post('/payments', requirePermission('finance.manage'), FinanceController.recordPayment);

module.exports = router;
