import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { fileUrl } from '../../utils/api';
import toast from 'react-hot-toast';
import { IconBooks, IconBook, IconPlus, IconUserCheck, IconArrowBackUp, IconSearch, IconX, IconCheck } from '@tabler/icons-react';

const LibraryDashboard = () => {
    const { user } = useAuth();
    const isLibrarianOrAdmin = ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LIBRARIAN'].includes(user?.role?.toUpperCase());

    const [activeTab, setActiveTab] = useState('catalog');
    const [stats, setStats] = useState({ totalBooks: 0, borrowedBooks: 0, overdueBooks: 0 });
    const [books, setBooks] = useState([]);
    const [loans, setLoans] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [studentGroups, setStudentGroups] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]); // For issuing books to students/lecturers
    const [loading, setLoading] = useState(true);

    // Modals
    const [showBookModal, setShowBookModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);

    // Form States
    const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: '', total_copies: 1 });
    const [pdfFile, setPdfFile] = useState(null);
    const [issueForm, setIssueForm] = useState({ bookId: '', userId: '', dueDate: '' });
    const [assignForm, setAssignForm] = useState({ bookId: '', studentGroupId: '' });

    useEffect(() => {
        fetchData();
        if (isLibrarianOrAdmin) {
            fetchSystemUsers();
        }
    }, [isLibrarianOrAdmin]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, booksRes, loansRes, assignmentsRes, classesRes] = await Promise.all([
                isLibrarianOrAdmin ? api.get('/library/stats') : Promise.resolve({ data: {} }),
                api.get('/library/books'),
                api.get('/library/loans'),
                isLibrarianOrAdmin ? api.get('/library/assignments') : Promise.resolve({ data: [] }),
                isLibrarianOrAdmin ? api.get('/student-groups') : Promise.resolve({ data: [] })
            ]);
            
            if (isLibrarianOrAdmin) setStats(statsRes.data);
            setBooks(booksRes.data);
            setLoans(loansRes.data);
            if (isLibrarianOrAdmin) {
                setAssignments(assignmentsRes.data);
                setStudentGroups(classesRes.data);
            }
        } catch (error) {
            toast.error('Failed to load library data');
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            // In a real app we might want to fetch both students and lecturers. 
            // For now, let's fetch students as the primary borrowers.
            const res = await api.get('/students');
            setSystemUsers(res.data);
        } catch (error) {
            console.error('Failed to load users');
        }
    };

    // === SUBMIT HANDLERS ===
    const handleAddBook = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', bookForm.title);
            formData.append('author', bookForm.author);
            formData.append('isbn', bookForm.isbn);
            formData.append('category', bookForm.category);
            formData.append('total_copies', bookForm.total_copies);
            if (pdfFile) {
                formData.append('pdfFile', pdfFile);
            }

            await api.post('/library/books', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Book added successfully');
            setShowBookModal(false);
            setBookForm({ title: '', author: '', isbn: '', category: '', total_copies: 1 });
            setPdfFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add book');
        }
    };

    const handleIssueBook = async (e) => {
        e.preventDefault();
        try {
            await api.post('/library/loans/issue', issueForm);
            toast.success('Book issued successfully');
            setShowIssueModal(false);
            setIssueForm({ bookId: '', userId: '', dueDate: '' });
            fetchData();
            setActiveTab('circulation');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to issue book');
        }
    };

    const handleReturnBook = async (loanId) => {
        if (!window.confirm('Are you sure you want to mark this book as returned?')) return;
        try {
            await api.put(`/library/loans/${loanId}/return`);
            toast.success('Book returned successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to return book');
        }
    };

    const handleAssignBook = async (e) => {
        e.preventDefault();
        if (!assignForm.bookId || !assignForm.studentGroupId) return toast.error('Fill required fields');
        try {
            await api.post('/library/assignments', assignForm);
            toast.success('Book assigned to class successfully');
            setAssignForm({ bookId: '', studentGroupId: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign book');
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to remove this assignment?')) return;
        try {
            await api.delete(`/library/assignments/${assignmentId}`);
            toast.success('Assignment removed successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove assignment');
        }
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Returned': return <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Returned</span>;
            case 'Overdue': return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Overdue</span>;
            default: return <span className="px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">Borrowed</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading library data...</div>;

    return (
        <div className="page ">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Library Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage book inventory, issue books, and track returns</p>
                </div>
                {isLibrarianOrAdmin && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowBookModal(true)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <IconPlus size={18} /> Add New Book
                        </button>
                        <button 
                            onClick={() => setShowIssueModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <IconUserCheck size={18} /> Issue Book
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Overview */}
            {isLibrarianOrAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
                            <IconBooks size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Books</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{stats.totalBooks}</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
                        <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-yellow-600 mb-4 border border-yellow-100">
                            <IconBook size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Books Borrowed</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{stats.borrowedBooks}</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-4 border border-red-100">
                            <IconArrowBackUp size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Overdue Returns</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{stats.overdueBooks}</h3>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'catalog' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                >
                    Book Catalog
                </button>
                <button 
                    onClick={() => setActiveTab('circulation')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'circulation' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                >
                    {isLibrarianOrAdmin ? 'Circulation & Returns' : 'My Borrowed Books'}
                </button>
                {isLibrarianOrAdmin && (
                    <button 
                        onClick={() => setActiveTab('assignments')}
                        className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'assignments' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                    >
                        Class Assignments
                    </button>
                )}
            </div>

            {/* Catalog Tab */}
            {activeTab === 'catalog' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Book Title</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Author</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ISBN</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Availability</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {books.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">No books in catalog</td>
                                    </tr>
                                ) : (
                                    books.map(book => (
                                        <tr key={book.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{book.title}</td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{book.author}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">{book.category}</span>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400">{book.isbn || 'N/A'}</td>
                                            <td className="p-4">
                                                {book.available_copies > 0 ? (
                                                    <span className="text-green-600 font-semibold text-sm">{book.available_copies} of {book.total_copies} Available</span>
                                                ) : (
                                                    <span className="text-red-500 font-semibold text-sm">Checked Out</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {book.pdf_url && (
                                                    <a 
                                                        href={fileUrl(book.pdf_url)}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-semibold bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors inline-block"
                                                    >
                                                        Read PDF
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Circulation Tab */}
            {activeTab === 'circulation' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Book Title</th>
                                    {isLibrarianOrAdmin && <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Borrower</th>}
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Date</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    {isLibrarianOrAdmin && <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loans.length === 0 ? (
                                    <tr>
                                        <td colSpan={isLibrarianOrAdmin ? 6 : 4} className="p-8 text-center text-slate-500 dark:text-slate-400">No active book loans</td>
                                    </tr>
                                ) : (
                                    loans.map(loan => (
                                        <tr key={loan.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{loan.book_title}</td>
                                            {isLibrarianOrAdmin && (
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{loan.first_name} {loan.last_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{loan.role_name}</p>
                                                </td>
                                            )}
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{new Date(loan.issue_date).toLocaleDateString()}</td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{new Date(loan.due_date).toLocaleDateString()}</td>
                                            <td className="p-4">{getStatusBadge(loan.status)}</td>
                                            {isLibrarianOrAdmin && (
                                                <td className="p-4">
                                                    {loan.status === 'Borrowed' && (
                                                        <button 
                                                            onClick={() => handleReturnBook(loan.id)}
                                                            className="text-xs font-semibold bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                                                        >
                                                            Mark Returned
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Assignments Tab */}
            {activeTab === 'assignments' && isLibrarianOrAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Assign Book to Class</h2>
                            <form onSubmit={handleAssignBook} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Select Book</label>
                                    <select 
                                        required 
                                        value={assignForm.bookId} 
                                        onChange={e => setAssignForm({...assignForm, bookId: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                    >
                                        <option value="">-- Choose Book --</option>
                                        {books.map(b => (
                                            <option key={b.id} value={b.id}>{b.title} (Available: {b.available_copies})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Student Group</label>
                                    <select
                                        required
                                        className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-primary-500 text-sm"
                                        value={assignForm.studentGroupId}
                                        onChange={(e) => setAssignForm({...assignForm, studentGroupId: e.target.value})}
                                    >
                                        <option value="">Select Student Group</option>
                                        {studentGroups.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full btn btn-primary py-3">
                                    Assign to Class
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                        <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Book Title</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Class</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {assignments.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-slate-500 dark:text-slate-400">No books assigned to classes yet.</td>
                                        </tr>
                                    ) : (
                                        assignments.map(assignment => (
                                            <tr key={assignment.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">{assignment.book_title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{assignment.student_group_name}</td>
                                                <td className="p-4">
                                                    <button 
                                                        onClick={() => handleRemoveAssignment(assignment.id)}
                                                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                        title="Remove Assignment"
                                                    >
                                                        <IconX size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal: Add Book */}
            {showBookModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Add New Book</h2>
                            <button onClick={() => setShowBookModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddBook} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Book Title</label>
                                <input type="text" required className="input" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} placeholder="e.g. Introduction to Physics" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Author</label>
                                <input type="text" required className="input" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} placeholder="e.g. John Doe" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">ISBN</label>
                                    <input type="text" className="input" value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Category</label>
                                    <input type="text" required className="input" value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} placeholder="e.g. Science" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Total Copies</label>
                                <input type="number" min="1" required className="input" value={bookForm.total_copies} onChange={e => setBookForm({...bookForm, total_copies: parseInt(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">E-Book PDF (Optional)</label>
                                <input type="file" accept="application/pdf" className="input" onChange={e => setPdfFile(e.target.files[0])} />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowBookModal(false)} className="btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Book</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Issue Book */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Issue Book to User</h2>
                            <button onClick={() => setShowIssueModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleIssueBook} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Select Book</label>
                                <select required className="input bg-white dark:bg-slate-800" value={issueForm.bookId} onChange={e => setIssueForm({...issueForm, bookId: e.target.value})}>
                                    <option value="">-- Choose Book --</option>
                                    {books.filter(b => b.available_copies > 0).map(b => (
                                        <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Select Borrower (Student)</label>
                                <select required className="input bg-white dark:bg-slate-800" value={issueForm.userId} onChange={e => setIssueForm({...issueForm, userId: e.target.value})}>
                                    <option value="">-- Choose Borrower --</option>
                                    {systemUsers.map(s => <option key={s.id} value={s.user_id}>{s.first_name} {s.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Due Date</label>
                                <input type="date" required className="input" value={issueForm.dueDate} onChange={e => setIssueForm({...issueForm, dueDate: e.target.value})} />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowIssueModal(false)} className="btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Issue Book</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LibraryDashboard;
