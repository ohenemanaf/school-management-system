const db = require('../../config/db');

class FinanceModel {
    // === FEE TYPES ===
    static async getAllFeeTypes() {
        const [rows] = await db.execute('SELECT * FROM fee_types ORDER BY id DESC');
        return rows;
    }

    static async createFeeType(name, description, amount) {
        const [result] = await db.execute(
            'INSERT INTO fee_types (name, description, amount) VALUES (?, ?, ?)',
            [name, description, amount]
        );
        return result.insertId;
    }

    static async updateFeeType(id, data) {
        const updates = [];
        const values = [];
        if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
        if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
        if (data.amount !== undefined) { updates.push('amount = ?'); values.push(data.amount); }
        if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
        
        if (updates.length === 0) return 0;
        
        values.push(id);
        const [result] = await db.execute(`UPDATE fee_types SET ${updates.join(', ')} WHERE id = ?`, values);
        return result.affectedRows;
    }

    // === INVOICES ===
    static async getAllInvoices(studentId = null) {
        let query = `
            SELECT i.*, f.name as fee_type_name, s.first_name, s.last_name, s.enrollment_number,
                   (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE invoice_id = i.id) as amount_paid
            FROM invoices i
            JOIN fee_types f ON i.fee_type_id = f.id
            JOIN students s ON i.student_id = s.id
        `;
        const values = [];
        
        if (studentId) {
            query += ' WHERE i.student_id = ?';
            values.push(studentId);
        }
        query += ' ORDER BY i.created_at DESC';

        const [rows] = await db.execute(query, values);
        return rows;
    }

    static async createInvoice(studentId, feeTypeId, amountDue, dueDate) {
        const [result] = await db.execute(
            'INSERT INTO invoices (student_id, fee_type_id, amount_due, due_date) VALUES (?, ?, ?, ?)',
            [studentId, feeTypeId, amountDue, dueDate]
        );
        return result.insertId;
    }

    static async getDefaulters() {
        const [rows] = await db.execute(`
            SELECT s.id as student_id, s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name,
                   SUM(i.amount_due) as total_due,
                   COALESCE((SELECT SUM(amount_paid) FROM payments p JOIN invoices inv ON p.invoice_id = inv.id WHERE inv.student_id = s.id), 0) as total_paid,
                   (SUM(i.amount_due) - COALESCE((SELECT SUM(amount_paid) FROM payments p JOIN invoices inv ON p.invoice_id = inv.id WHERE inv.student_id = s.id), 0)) as balance
            FROM students s
            LEFT JOIN student_groups sg ON s.student_group_id = sg.id
            JOIN invoices i ON s.id = i.student_id
            GROUP BY s.id
            HAVING balance > 0
            ORDER BY balance DESC
        `);
        return rows;
    }

    static async updateInvoiceStatus(id, status) {
        const [result] = await db.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows;
    }

    // === PAYMENTS ===
    static async getPaymentsByInvoice(invoiceId) {
        const [rows] = await db.execute('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', [invoiceId]);
        return rows;
    }

    static async recordPayment(invoiceId, amountPaid, paymentMethod, referenceNumber, notes) {
        // Run in transaction to ensure invoice status is updated correctly
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(
                'INSERT INTO payments (invoice_id, amount_paid, payment_method, reference_number, notes) VALUES (?, ?, ?, ?, ?)',
                [invoiceId, amountPaid, paymentMethod, referenceNumber || null, notes || null]
            );

            // Calculate total paid vs amount due to update status
            const [invoiceRows] = await connection.execute('SELECT amount_due FROM invoices WHERE id = ?', [invoiceId]);
            const [paymentRows] = await connection.execute('SELECT SUM(amount_paid) as total_paid FROM payments WHERE invoice_id = ?', [invoiceId]);
            
            const amountDue = parseFloat(invoiceRows[0].amount_due);
            const totalPaid = parseFloat(paymentRows[0].total_paid || 0);

            let newStatus = 'Pending';
            if (totalPaid >= amountDue) {
                newStatus = 'Paid';
            } else if (totalPaid > 0) {
                newStatus = 'Partial';
            }

            await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, invoiceId]);

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // === DASHBOARD STATS ===
    static async getFinanceStats() {
        // Total collected
        const [paidRows] = await db.execute('SELECT SUM(amount_paid) as total FROM payments');
        
        // Total pending
        const [dueRows] = await db.execute('SELECT SUM(amount_due) as total FROM invoices WHERE status != "Paid"');
        const [partiallyPaidRows] = await db.execute(`
            SELECT SUM(p.amount_paid) as total 
            FROM payments p 
            JOIN invoices i ON p.invoice_id = i.id 
            WHERE i.status = "Partial"
        `);

        const totalCollected = parseFloat(paidRows[0].total || 0);
        const totalDue = parseFloat(dueRows[0].total || 0);
        const partiallyPaid = parseFloat(partiallyPaidRows[0].total || 0);
        const pendingDues = totalDue - partiallyPaid; // Only the remaining amount of what's due

        const [invoiceCount] = await db.execute('SELECT COUNT(*) as total FROM invoices');
        const [paymentCount] = await db.execute('SELECT COUNT(*) as total FROM payments');

        return {
            totalCollected,
            pendingDues: pendingDues > 0 ? pendingDues : 0,
            totalInvoices: invoiceCount[0].total,
            totalPayments: paymentCount[0].total
        };
    }
}

module.exports = FinanceModel;
