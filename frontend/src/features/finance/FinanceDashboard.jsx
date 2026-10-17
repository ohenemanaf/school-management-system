import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { IconWallet, IconFileInvoice, IconReceipt, IconPlus, IconCurrencyDollar, IconCash, IconCreditCard, IconX, IconCheck } from '@tabler/icons-react';

const FinanceDashboard = () => {
    const { user } = useAuth();
    const isAdminOrAccountant = ['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role?.toUpperCase().replace(' ', '_'));

    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ totalCollected: 0, pendingDues: 0, totalInvoices: 0, totalPayments: 0 });
    const [invoices, setInvoices] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);
    const [defaulters, setDefaulters] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Form States
    const [feeForm, setFeeForm] = useState({ name: '', description: '', amount: '' });
    const [invoiceForm, setInvoiceForm] = useState({ studentId: '', feeTypeId: '', amountDue: '', dueDate: '' });
    const [paymentForm, setPaymentForm] = useState({ amountPaid: '', paymentMethod: 'Cash', referenceNumber: '', notes: '' });

    useEffect(() => {
        fetchData();
        if (isAdminOrAccountant) {
            fetchStudents();
        }
    }, [isAdminOrAccountant]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, invoicesRes, feesRes, defaultersRes] = await Promise.all([
                isAdminOrAccountant ? api.get('/finance/stats') : Promise.resolve({ data: {} }),
                api.get('/finance/invoices'),
                isAdminOrAccountant ? api.get('/finance/fee-types') : Promise.resolve({ data: [] }),
                isAdminOrAccountant ? api.get('/finance/defaulters') : Promise.resolve({ data: [] })
            ]);
            
            if (isAdminOrAccountant) setStats(statsRes.data);
            setInvoices(invoicesRes.data);
            if (isAdminOrAccountant) {
                setFeeTypes(feesRes.data);
                setDefaulters(defaultersRes.data);
            }
        } catch (error) {
            toast.error('Failed to load finance data');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('/students');
            setStudents(res.data);
        } catch (error) {
            console.error('Failed to load students');
        }
    };

    // === SUBMIT HANDLERS ===
    const handleCreateFeeType = async (e) => {
        e.preventDefault();
        try {
            await api.post('/finance/fee-types', feeForm);
            toast.success('Fee type created successfully');
            setShowFeeModal(false);
            setFeeForm({ name: '', description: '', amount: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create fee type');
        }
    };

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        try {
            await api.post('/finance/invoices', invoiceForm);
            toast.success('Invoice generated successfully');
            setShowInvoiceModal(false);
            setInvoiceForm({ studentId: '', feeTypeId: '', amountDue: '', dueDate: '' });
            fetchData();
            setActiveTab('invoices');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate invoice');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/finance/payments', {
                invoiceId: selectedInvoice.id,
                ...paymentForm
            });
            toast.success('Payment recorded successfully');
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            setPaymentForm({ amountPaid: '', paymentMethod: 'Cash', referenceNumber: '', notes: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'Paid': return <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Paid</span>;
            case 'Partial': return <span className="px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">Partial</span>;
            default: return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Pending</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading finance data...</div>;

    return (
        <div className="page ">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Finance Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage fees, invoices, and payments</p>
                </div>
                {isAdminOrAccountant && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowFeeModal(true)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <IconPlus size={18} /> New Fee Type
                        </button>
                        <button 
                            onClick={() => setShowInvoiceModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <IconFileInvoice size={18} /> Generate Invoice
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Overview */}
            {isAdminOrAccountant && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                            <IconCurrencyDollar size={100} />
                        </div>
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4 border border-green-100">
                            <IconCash size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Collected</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(stats.totalCollected)}</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                            <IconWallet size={100} />
                        </div>
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-4 border border-red-100">
                            <IconWallet size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Pending Dues</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(stats.pendingDues)}</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
                            <IconFileInvoice size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Invoices</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{stats.totalInvoices}</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4 border border-purple-100">
                            <IconReceipt size={24} stroke={2} />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Payments Made</p>
                        <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100">{stats.totalPayments}</h3>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button 
                    onClick={() => setActiveTab('invoices')}
                    className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                >
                    Invoices
                </button>
                {isAdminOrAccountant && (
                    <button 
                        onClick={() => setActiveTab('fees')}
                        className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'fees' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                    >
                        Fee Types
                    </button>
                )}
                {isAdminOrAccountant && (
                    <button 
                        onClick={() => setActiveTab('defaulters')}
                        className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'defaulters' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100'}`}
                    >
                        Defaulters
                    </button>
                )}
            </div>

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invoice #</th>
                                    {isAdminOrAccountant && <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>}
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fee Type</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Due</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount Paid</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                                    {isAdminOrAccountant && <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-slate-500 dark:text-slate-400">No invoices found</td>
                                    </tr>
                                ) : (
                                    invoices.map(invoice => (
                                        <tr key={invoice.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">INV-{invoice.id.toString().padStart(5, '0')}</td>
                                            {isAdminOrAccountant && (
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{invoice.first_name} {invoice.last_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.enrollment_number}</p>
                                                </td>
                                            )}
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{invoice.fee_type_name}</td>
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(invoice.amount_due)}</td>
                                            <td className="p-4 font-medium text-green-600">{formatCurrency(invoice.amount_paid)}</td>
                                            <td className="p-4">{getStatusBadge(invoice.status)}</td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{new Date(invoice.due_date).toLocaleDateString()}</td>
                                            {isAdminOrAccountant && (
                                                <td className="p-4">
                                                    {invoice.status !== 'Paid' && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedInvoice(invoice);
                                                                setPaymentForm(prev => ({ ...prev, amountPaid: invoice.amount_due - invoice.amount_paid }));
                                                                setShowPaymentModal(true);
                                                            }}
                                                            className="text-xs font-semibold bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                                                        >
                                                            Record Payment
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

            {/* Defaulters Tab */}
            {activeTab === 'defaulters' && isAdminOrAccountant && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-red-50/50 border-b border-red-100">
                                    <th className="p-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Student ID</th>
                                    <th className="p-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Name</th>
                                    <th className="p-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Class</th>
                                    <th className="p-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Total Due</th>
                                    <th className="p-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Amount Paid</th>
                                    <th className="p-4 text-xs font-semibold text-red-600 uppercase tracking-wider">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {defaulters.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold">No defaulters found! Everyone is paid up. 🎉</td>
                                    </tr>
                                ) : (
                                    defaulters.map(student => (
                                        <tr key={student.student_id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">{student.enrollment_number}</td>
                                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{student.first_name} {student.last_name}</td>
                                            <td className="p-4 font-medium text-slate-500 dark:text-slate-400">{student.class_name || 'Unassigned'}</td>
                                            <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{formatCurrency(student.total_due)}</td>
                                            <td className="p-4 font-medium text-green-600">{formatCurrency(student.total_paid)}</td>
                                            <td className="p-4 font-semibold text-red-600">{formatCurrency(student.balance)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Fee Types Tab */}
            {activeTab === 'fees' && isAdminOrAccountant && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feeTypes.length === 0 ? (
                        <div className="col-span-full p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                            No fee types defined yet. Click "New Fee Type" to get started.
                        </div>
                    ) : (
                        feeTypes.map(fee => (
                            <div key={fee.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <IconReceipt size={20} />
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${fee.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                        {fee.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{fee.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[40px]">{fee.description || 'No description provided.'}</p>
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-end justify-between">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default Amount</p>
                                    <p className="text-xl font-semibold text-slate-900 dark:text-white">{formatCurrency(fee.amount)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal: New Fee Type */}
            {showFeeModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Create Fee Type</h2>
                            <button onClick={() => setShowFeeModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFeeType} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Fee Name</label>
                                <input type="text" required className="input" value={feeForm.name} onChange={e => setFeeForm({...feeForm, name: e.target.value})} placeholder="e.g. Tuition Fee" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Description (Optional)</label>
                                <textarea className="input min-h-[100px] resize-none" value={feeForm.description} onChange={e => setFeeForm({...feeForm, description: e.target.value})} placeholder="Details about this fee..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Amount ($)</label>
                                <input type="number" step="0.01" required className="input" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} placeholder="0.00" />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowFeeModal(false)} className="btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Fee</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Generate Invoice */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Generate Invoice</h2>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleGenerateInvoice} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Select Student</label>
                                <select required className="input bg-white dark:bg-slate-800" value={invoiceForm.studentId} onChange={e => setInvoiceForm({...invoiceForm, studentId: e.target.value})}>
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.enrollment_number})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Select Fee Type</label>
                                <select required className="input bg-white dark:bg-slate-800" value={invoiceForm.feeTypeId} onChange={e => {
                                    const fee = feeTypes.find(f => f.id.toString() === e.target.value);
                                    setInvoiceForm({...invoiceForm, feeTypeId: e.target.value, amountDue: fee ? fee.amount : ''});
                                }}>
                                    <option value="">-- Choose Fee Type --</option>
                                    {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name} ({formatCurrency(f.amount)})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Amount Due ($)</label>
                                    <input type="number" step="0.01" required className="input" value={invoiceForm.amountDue} onChange={e => setInvoiceForm({...invoiceForm, amountDue: e.target.value})} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Due Date</label>
                                    <input type="date" required className="input" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Generate Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Payment */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Record Payment</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Invoice: INV-{selectedInvoice.id.toString().padStart(5, '0')} • {selectedInvoice.first_name} {selectedInvoice.last_name}</p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center mb-2">
                                <div>
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Total Due</p>
                                    <p className="text-xl font-semibold text-blue-900">{formatCurrency(selectedInvoice.amount_due)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Already Paid</p>
                                    <p className="text-xl font-semibold text-blue-900">{formatCurrency(selectedInvoice.amount_paid)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Amount Paying Now ($)</label>
                                    <input type="number" step="0.01" required className="input" value={paymentForm.amountPaid} onChange={e => setPaymentForm({...paymentForm, amountPaid: e.target.value})} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Payment Method</label>
                                    <select className="input bg-white dark:bg-slate-800" value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Mobile Money">Mobile Money</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Reference Number (Optional)</label>
                                <input type="text" className="input" value={paymentForm.referenceNumber} onChange={e => setPaymentForm({...paymentForm, referenceNumber: e.target.value})} placeholder="Transaction ID, Cheque #, etc." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Notes (Optional)</label>
                                <textarea className="input min-h-[80px] resize-none" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Additional details..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">Cancel</button>
                                <button type="submit" className="btn btn-primary flex items-center gap-2"><IconCheck size={18} /> Complete Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FinanceDashboard;
