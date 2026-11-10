const FinanceModel = require('./finance.model');
const db = require('../../config/db');
const { studentIdFor } = require('../../utils/currentProfile');

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'];

class FinanceController {
    // === FEE TYPES ===
    static async getFeeTypes(req, res) {
        try {
            const feeTypes = await FinanceModel.getAllFeeTypes();
            res.json(feeTypes);
        } catch (error) {
            console.error('Error fetching fee types:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async createFeeType(req, res) {
        try {
            const { name, description, amount } = req.body;
            if (!name || !amount) {
                return res.status(400).json({ message: 'Name and amount are required' });
            }
            const id = await FinanceModel.createFeeType(name, description, amount);
            res.status(201).json({ message: 'Fee type created successfully', id });
        } catch (error) {
            console.error('Error creating fee type:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async updateFeeType(req, res) {
        try {
            const { id } = req.params;
            await FinanceModel.updateFeeType(id, req.body);
            res.json({ message: 'Fee type updated successfully' });
        } catch (error) {
            console.error('Error updating fee type:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === INVOICES ===
    static async getInvoices(req, res) {
        try {
            // If user is STUDENT, only return their own invoices
            let studentId = null;
            if (req.user.role === 'STUDENT') {
                studentId = await studentIdFor(req.user.id);
                if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
            }
            
            const invoices = await FinanceModel.getAllInvoices(studentId);
            res.json(invoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async getDefaulters(req, res) {
        try {
            const defaulters = await FinanceModel.getDefaulters();
            res.json(defaulters);
        } catch (error) {
            console.error('Error fetching defaulters:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async createInvoice(req, res) {
        try {
            const { studentId, feeTypeId, amountDue, dueDate } = req.body;
            if (!studentId || !feeTypeId || !amountDue || !dueDate) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const id = await FinanceModel.createInvoice(studentId, feeTypeId, amountDue, dueDate);
            res.status(201).json({ message: 'Invoice created successfully', id });
        } catch (error) {
            console.error('Error creating invoice:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === PAYMENTS ===
    static async getPayments(req, res) {
        try {
            const { invoiceId } = req.params;
            if (req.user.role === 'STUDENT') {
                // Students may only see payments on their own invoices.
                const studentId = await studentIdFor(req.user.id);
                const [owner] = await db.execute('SELECT student_id FROM invoices WHERE id = ?', [invoiceId]);
                if (!studentId || owner.length === 0 || owner[0].student_id !== studentId) {
                    return res.status(404).json({ message: 'Invoice not found' });
                }
            }
            const payments = await FinanceModel.getPaymentsByInvoice(invoiceId);
            res.json(payments);
        } catch (error) {
            console.error('Error fetching payments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async recordPayment(req, res) {
        try {
            const { invoiceId, amountPaid, paymentMethod, referenceNumber, notes } = req.body;
            if (!invoiceId || !(Number(amountPaid) > 0)) {
                return res.status(400).json({ message: 'Invoice ID and a positive Amount Paid are required' });
            }
            
            const method = paymentMethod || 'Cash';
            if (!PAYMENT_METHODS.includes(method)) {
                return res.status(400).json({ message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` });
            }
            const id = await FinanceModel.recordPayment(invoiceId, amountPaid, method, referenceNumber, notes);
            res.status(201).json({ message: 'Payment recorded successfully', id });
        } catch (error) {
            if (error.status === 404) return res.status(404).json({ message: error.message });
            console.error('Error recording payment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === DASHBOARD STATS ===
    static async getStats(req, res) {
        try {
            const stats = await FinanceModel.getFinanceStats();
            res.json(stats);
        } catch (error) {
            console.error('Error fetching finance stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = FinanceController;
