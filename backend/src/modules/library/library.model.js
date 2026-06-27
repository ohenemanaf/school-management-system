const db = require('../../config/db');

class LibraryModel {
    // === BOOKS ===
    static async getAllBooks() {
        const [rows] = await db.execute('SELECT * FROM books ORDER BY title ASC');
        return rows;
    }

    static async getBookById(id) {
        const [rows] = await db.execute('SELECT * FROM books WHERE id = ?', [id]);
        return rows[0];
    }

    static async createBook(title, author, isbn, category, total_copies, pdf_url) {
        const [result] = await db.execute(
            'INSERT INTO books (title, author, isbn, category, total_copies, available_copies, pdf_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, author, isbn, category, total_copies, total_copies, pdf_url]
        );
        return result.insertId;
    }

    static async updateBook(id, data) {
        const { title, author, isbn, category, total_copies, available_copies } = data;
        await db.execute(
            'UPDATE books SET title=?, author=?, isbn=?, category=?, total_copies=?, available_copies=? WHERE id=?',
            [title, author, isbn, category, total_copies, available_copies, id]
        );
    }

    static async deleteBook(id) {
        await db.execute('DELETE FROM books WHERE id = ?', [id]);
    }

    // === CLASS ASSIGNMENTS ===
    static async getClassAssignments(studentGroupId = null) {
        let query = `
            SELECT a.id, a.book_id, a.student_group_id, b.title as book_title, sg.name as student_group_name, b.pdf_url, b.author 
            FROM book_class_assignments a
            JOIN books b ON a.book_id = b.id
            JOIN student_groups sg ON a.student_group_id = sg.id
        `;
        const values = [];
        if (studentGroupId) {
            query += ` WHERE a.student_group_id = ?`;
            values.push(studentGroupId);
        }
        query += ` ORDER BY a.created_at DESC`;

        const [rows] = await db.execute(query, values);
        return rows;
    }

    static async assignToClass(bookId, studentGroupId) {
        const [result] = await db.execute(
            'INSERT INTO book_class_assignments (book_id, student_group_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE book_id=book_id',
            [bookId, studentGroupId]
        );
        return result.insertId;
    }

    static async removeFromClass(assignmentId) {
        await db.execute('DELETE FROM book_class_assignments WHERE id = ?', [assignmentId]);
    }

    // === LOANS ===
    static async getAllLoans() {
        const [rows] = await db.execute(`
            SELECT l.*, b.title as book_title, b.isbn, 
                   COALESCE(s.first_name, 'Staff') as first_name, 
                   COALESCE(s.last_name, 'Member') as last_name, 
                   u.email, r.name as role_name
            FROM book_loans l
            JOIN books b ON l.book_id = b.id
            JOIN users u ON l.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN students s ON s.user_id = u.id
            ORDER BY l.issue_date DESC
        `);
        return rows;
    }

    static async getLoansByUser(userId) {
        const [rows] = await db.execute(`
            SELECT l.*, b.title as book_title, b.isbn
            FROM book_loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.user_id = ?
            ORDER BY l.issue_date DESC
        `, [userId]);
        return rows;
    }

    static async issueBook(bookId, userId, issueDate, dueDate) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Check availability
            const [books] = await connection.execute('SELECT available_copies FROM books WHERE id = ? FOR UPDATE', [bookId]);
            if (books.length === 0 || books[0].available_copies <= 0) {
                throw new Error('Book not available');
            }

            // Create loan
            const [result] = await connection.execute(
                'INSERT INTO book_loans (book_id, user_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?)',
                [bookId, userId, issueDate, dueDate, 'Borrowed']
            );

            // Decrease available copies
            await connection.execute(
                'UPDATE books SET available_copies = available_copies - 1 WHERE id = ?',
                [bookId]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async returnBook(loanId, returnDate) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Get loan details
            const [loans] = await connection.execute('SELECT book_id, status FROM book_loans WHERE id = ? FOR UPDATE', [loanId]);
            if (loans.length === 0) throw new Error('Loan not found');
            if (loans[0].status === 'Returned') throw new Error('Book already returned');

            const bookId = loans[0].book_id;

            // Update loan
            await connection.execute(
                'UPDATE book_loans SET status = ?, return_date = ? WHERE id = ?',
                ['Returned', returnDate, loanId]
            );

            // Increase available copies
            await connection.execute(
                'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?',
                [bookId]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // === STATS ===
    static async getStats() {
        const [booksCount] = await db.execute('SELECT COUNT(*) as total FROM books');
        const [borrowedCount] = await db.execute("SELECT COUNT(*) as total FROM book_loans WHERE status = 'Borrowed'");
        const [overdueCount] = await db.execute("SELECT COUNT(*) as total FROM book_loans WHERE status = 'Overdue' OR (status = 'Borrowed' AND due_date < CURDATE())");
        
        return {
            totalBooks: booksCount[0].total,
            borrowedBooks: borrowedCount[0].total,
            overdueBooks: overdueCount[0].total
        };
    }
}

module.exports = LibraryModel;
