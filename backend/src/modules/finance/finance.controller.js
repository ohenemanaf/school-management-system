const FinanceModel = require('./finance.model');

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
                const db = require('../../config/db');
                const [rows] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
                if (rows.length === 0) return res.status(404).json({ message: 'Student profile not found' });
                studentId = rows[0].id;
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
            if (!invoiceId || !amountPaid) {
                return res.status(400).json({ message: 'Invoice ID and Amount Paid are required' });
            }
            
            const id = await FinanceModel.recordPayment(invoiceId, amountPaid, paymentMethod, referenceNumber, notes);
            res.status(201).json({ message: 'Payment recorded successfully', id });
        } catch (error) {
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
