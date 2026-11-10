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
        // Totals are aggregated once per student instead of re-running a
        // payments subquery twice for every student row.
        const [rows] = await db.execute(`
            SELECT s.id as student_id, s.first_name, s.last_name, s.enrollment_number,
                   sg.name as student_group_name,
                   d.total_due,
                   COALESCE(p.total_paid, 0) as total_paid,
                   d.total_due - COALESCE(p.total_paid, 0) as balance
            FROM (SELECT student_id, SUM(amount_due) AS total_due FROM invoices GROUP BY student_id) d
            JOIN students s ON s.id = d.student_id
            LEFT JOIN student_groups sg ON s.student_group_id = sg.id
            LEFT JOIN (
                SELECT i.student_id, SUM(pay.amount_paid) AS total_paid
                FROM payments pay JOIN invoices i ON pay.invoice_id = i.id
                GROUP BY i.student_id
            ) p ON p.student_id = d.student_id
            WHERE d.total_due - COALESCE(p.total_paid, 0) > 0
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

            // Lock the invoice so concurrent payments compute the status from the same total.
            const [locked] = await connection.execute('SELECT id FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
            if (locked.length === 0) throw Object.assign(new Error('Invoice not found'), { status: 404 });

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
        // One round trip instead of five.
        const [[row]] = await db.execute(`
            SELECT
                (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) AS total_collected,
                (SELECT COALESCE(SUM(amount_due), 0) FROM invoices WHERE status <> 'Paid') AS total_due,
                (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p
                  JOIN invoices i ON p.invoice_id = i.id WHERE i.status = 'Partial') AS partially_paid,
                (SELECT COUNT(*) FROM invoices) AS total_invoices,
                (SELECT COUNT(*) FROM payments) AS total_payments
        `);

        // Only the remaining amount of what's due
        const pendingDues = parseFloat(row.total_due) - parseFloat(row.partially_paid);
        return {
            totalCollected: parseFloat(row.total_collected),
            pendingDues: pendingDues > 0 ? pendingDues : 0,
            totalInvoices: row.total_invoices,
            totalPayments: row.total_payments
        };
    }
}

module.exports = FinanceModel;
