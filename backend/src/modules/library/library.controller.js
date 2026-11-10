const LibraryModel = require('./library.model');
const { signFields } = require('../../utils/signedUploads');
const { can } = require('../../config/permissions');

class LibraryController {
    // === STATS ===
    static async getStats(req, res) {
        try {
            const stats = await LibraryModel.getStats();
            res.json(stats);
        } catch (error) {
            console.error('Error fetching library stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === BOOKS ===
    static async getAllBooks(req, res) {
        try {
            const books = await LibraryModel.getAllBooks();
            res.json(signFields(books, 'pdf_url'));
        } catch (error) {
            console.error('Error fetching books:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async createBook(req, res) {
        try {
            const { title, author, isbn, category, total_copies } = req.body;
            if (!title || !author) {
                return res.status(400).json({ message: 'Title and author are required' });
            }
            
            let pdfUrl = null;
            if (req.file) {
                pdfUrl = `/uploads/library/${req.file.filename}`;
            }

            const id = await LibraryModel.createBook(title, author, isbn, category, total_copies || 1, pdfUrl);
            res.status(201).json({ message: 'Book added successfully', id });
        } catch (error) {
            console.error('Error creating book:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async updateBook(req, res) {
        try {
            const { id } = req.params;
            const { total_copies, available_copies } = req.body;
            for (const value of [total_copies, available_copies]) {
                if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < 0)) {
                    return res.status(400).json({ message: 'Copy counts must be whole numbers of 0 or more' });
                }
            }
            if (total_copies !== undefined && available_copies !== undefined && Number(available_copies) > Number(total_copies)) {
                return res.status(400).json({ message: 'Available copies cannot exceed total copies' });
            }
            await LibraryModel.updateBook(id, req.body);
            res.json({ message: 'Book updated successfully' });
        } catch (error) {
            console.error('Error updating book:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async deleteBook(req, res) {
        try {
            await LibraryModel.deleteBook(req.params.id);
            res.json({ message: 'Book deleted successfully' });
        } catch (error) {
            console.error('Error deleting book:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === CLASS ASSIGNMENTS ===
    static async getClassAssignments(req, res) {
        try {
            let studentGroupId = null;
            if (req.user.role === 'STUDENT') {
                const db = require('../../config/db');
                const [students] = await db.execute('SELECT student_group_id FROM students WHERE user_id = ?', [req.user.id]);
                if (students.length > 0 && students[0].student_group_id) {
                    studentGroupId = students[0].student_group_id;
                } else {
                    return res.json([]); // Student not in a class
                }
            }
            const assignments = await LibraryModel.getClassAssignments(studentGroupId);
            res.json(signFields(assignments, 'pdf_url'));
        } catch (error) {
            console.error('Error fetching class assignments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async assignToClass(req, res) {
        try {
            const { bookId, studentGroupId } = req.body;
            if (!bookId || !studentGroupId) return res.status(400).json({ message: 'bookId and studentGroupId required' });
            await LibraryModel.assignToClass(bookId, studentGroupId);
            res.status(201).json({ message: 'Book assigned to class successfully' });
        } catch (error) {
            console.error('Error assigning book to class:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async removeFromClass(req, res) {
        try {
            await LibraryModel.removeFromClass(req.params.id);
            res.json({ message: 'Assignment removed successfully' });
        } catch (error) {
            console.error('Error removing assignment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    // === LOANS ===
    static async getAllLoans(req, res) {
        try {
            // Only library managers see every loan; everyone else sees their own.
            if (!can(req.user.role, 'library.manage')) {
                const loans = await LibraryModel.getLoansByUser(req.user.id);
                return res.json(loans);
            }
            
            // Admins/Librarians see all loans
            const loans = await LibraryModel.getAllLoans();
            res.json(loans);
        } catch (error) {
            console.error('Error fetching loans:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async issueBook(req, res) {
        try {
            const { bookId, userId, issueDate, dueDate } = req.body;
            if (!bookId || !userId || !dueDate) {
                return res.status(400).json({ message: 'Book, User, and Due Date are required' });
            }

            const issue = issueDate || new Date().toISOString().split('T')[0];
            const id = await LibraryModel.issueBook(bookId, userId, issue, dueDate);
            res.status(201).json({ message: 'Book issued successfully', id });
        } catch (error) {
            console.error('Error issuing book:', error);
            if (error.message === 'Book not available') {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async returnBook(req, res) {
        try {
            const { id } = req.params;
            const returnDate = new Date().toISOString().split('T')[0];
            await LibraryModel.returnBook(id, returnDate);
            res.json({ message: 'Book returned successfully' });
        } catch (error) {
            console.error('Error returning book:', error);
            if (error.message === 'Loan not found' || error.message === 'Book already returned') {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = LibraryController;
