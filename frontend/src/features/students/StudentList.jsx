import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconSearch, IconPlus, IconEdit, IconTrash, IconSchool, IconX, IconUpload, IconFileSpreadsheet } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import StudentOnboardingWizard from './StudentOnboardingWizard';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal state
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editStudentId, setEditStudentId] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', password: '', enrollmentNumber: '', dateOfBirth: '', gender: 'Male',
        address: '', guardianName: '', guardianPhone: '', medicalConditions: '', bloodGroup: '',
        studentGroupId: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [studentGroups, setStudentGroups] = useState([]);
    
    // Bulk Upload state
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchStudents();
        fetchStudentGroups();
    }, []);

    const fetchStudentGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setStudentGroups(response.data);
        } catch (error) {
            console.error('Failed to load student groups', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const response = await api.get('/students');
            setStudents(response.data);
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student?')) return;
        try {
            await api.delete(`/students/${id}`);
            toast.success('Student deleted successfully');
            fetchStudents();
        } catch (error) {
            toast.error('Failed to delete student');
        }
    };

    const handleOpenModal = (student = null) => {
        if (student) {
            setEditStudentId(student.id);
            setFormData({
                firstName: student.first_name || '',
                lastName: student.last_name || '',
                email: student.email || '',
                password: '', // Leave blank when editing
                enrollmentNumber: student.enrollment_number || '',
                dateOfBirth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
                gender: student.gender || 'Male',
                address: student.address || '',
                guardianName: student.guardian_name || '',
                guardianPhone: student.guardian_phone || '',
                medicalConditions: student.medical_conditions || '',
                bloodGroup: student.blood_group || '',
                studentGroupId: student.student_group_id || ''
            });
        } else {
            setEditStudentId(null);
            setFormData({ 
                firstName: '', lastName: '', email: '', password: '', enrollmentNumber: '', dateOfBirth: '', gender: 'Male',
                address: '', guardianName: '', guardianPhone: '', medicalConditions: '', bloodGroup: '',
                studentGroupId: ''
            });
            setIsWizardOpen(true);
            return;
        }
        setProfileImage(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'password' && !formData[key] && editStudentId) return; // Skip empty password on edit
                if (formData[key] !== null && formData[key] !== '') {
                    data.append(key, formData[key]);
                }
            });
            if (profileImage) {
                data.append('profileImage', profileImage);
            }

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editStudentId) {
                await api.put(`/students/${editStudentId}`, data, config);
                toast.success('Student updated successfully');
            } else {
                await api.post('/students', data, config);
                toast.success('Student added successfully');
            }
            setIsModalOpen(false);
            fetchStudents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save student');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
        } else {
            toast.error("Please upload a valid CSV file");
            e.target.value = null;
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!csvFile) return toast.error("Please select a file first");

        setIsUploading(true);
        const data = new FormData();
        data.append('file', csvFile);

        try {
            const response = await api.post('/students/bulk-upload', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            toast.success(`Bulk upload complete! ${response.data.successful} enrolled.`);
            if (response.data.failed > 0) {
                toast.error(`${response.data.failed} failed. Check console for details.`);
                console.warn("Failed uploads:", response.data.failedDetails);
            }
            
            setIsBulkModalOpen(false);
            setCsvFile(null);
            fetchStudents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    };

    const filteredStudents = students.filter(s => 
        (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
        s.enrollment_number.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Students</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage student records and enrollments.</p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">
                            <IconUpload size={20} />
                            Bulk Upload
                        </button>
                        <button onClick={handleOpenModal} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm shadow-primary-200 transition-colors cursor-pointer">
                            <IconPlus size={20} />
                            Add New Student
                        </button>
                    </div>
                )}
            </div>

            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Bulk Upload Students</h2>
                            <button onClick={() => { setIsBulkModalOpen(false); setCsvFile(null); }} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                                <IconX size={24} />
                            </button>
                        </div>
                        <div className="p-8 text-center">
                            <form id="bulkForm" onSubmit={handleBulkUpload}>
                                <div className="border-2 border-dashed border-primary-200 bg-primary-50/50 rounded-2xl p-10 flex flex-col items-center justify-center relative hover:bg-primary-50 transition-colors cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                    />
                                    <IconFileSpreadsheet size={48} className={`mb-4 ${csvFile ? 'text-primary-600' : 'text-primary-300'}`} />
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
                                        {csvFile ? csvFile.name : 'Upload CSV File'}
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : 'Drag and drop or click to browse'}
                                    </p>
                                </div>
                                <div className="mt-6 text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Required CSV Headers:</p>
                                    <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded inline-block border border-slate-200 dark:border-slate-700">First Name, Last Name, Email, Index Number</p>
                                </div>
                            </form>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => { setIsBulkModalOpen(false); setCsvFile(null); }} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button form="bulkForm" type="submit" disabled={isUploading || !csvFile} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer">
                                {isUploading ? 'Uploading...' : 'Process CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                {editStudentId ? 'Edit Student' : 'Enroll New Student'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                                <IconX size={24} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <form id="studentForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-2">Basic Information</h3>
                                </div>
                                <div className="md:col-span-2 flex flex-col md:flex-row gap-6 items-start">
                                    <div className="shrink-0">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Profile Image</label>
                                        <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                            {profileImage ? (
                                                <img src={URL.createObjectURL(profileImage)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <IconUpload size={24} className="mx-auto text-slate-400 mb-1 group-hover:text-primary-500 transition-colors" />
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Upload Photo</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={e => setProfileImage(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">First Name *</label>
                                            <input required type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Last Name *</label>
                                            <input required type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Date of Birth *</label>
                                            <input required type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Email Address *</label>
                                            <input required type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Gender *</label>
                                    <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Blood Group</label>
                                    <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})}>
                                        <option value="">Select Blood Group</option>
                                        <option value="A+">A+</option><option value="A-">A-</option>
                                        <option value="B+">B+</option><option value="B-">B-</option>
                                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        <option value="O+">O+</option><option value="O-">O-</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 mt-2">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-2">Academic Enrollment</h3>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Student Group / Cohort *</label>
                                    <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.studentGroupId} onChange={e => setFormData({...formData, studentGroupId: e.target.value})}>
                                        <option value="">Select Group</option>
                                        {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2 mt-2">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-2">Administrative & Medical</h3>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Home Address</label>
                                    <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100 resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Guardian Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Guardian Phone</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Medical Conditions / Allergies</label>
                                    <textarea rows="2" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-slate-800 dark:text-slate-100 resize-none" placeholder="List any known allergies or conditions..." value={formData.medicalConditions} onChange={e => setFormData({...formData, medicalConditions: e.target.value})}></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button form="studentForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer">
                                {isSubmitting ? 'Saving...' : (editStudentId ? 'Update Student' : 'Save Student')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="glass rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-white dark:bg-slate-800/40">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <IconSearch size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Enrollment No.</th>
                                <th className="px-6 py-4">Gender</th>
                                <th className="px-6 py-4">Account Status</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <IconSchool size={48} className="mb-4 opacity-50" />
                                            <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">No students found</p>
                                            <p className="text-sm mt-1">Try adjusting your search criteria or add a new student.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-primary-50/30 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3 min-w-0">
                                            <img 
                                                src={student.profile_image_url ? (student.profile_image_url.startsWith('http') ? student.profile_image_url : `http://localhost:5000${student.profile_image_url}`) : `https://avatar.iran.liara.run/public/${student.gender?.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${student.first_name}+${student.last_name}`}
                                                alt="" 
                                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 object-cover shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={`${student.first_name} ${student.last_name}`}>{student.first_name} {student.last_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={student.email}>{student.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-semibold">{student.enrollment_number}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{student.gender}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${student.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {student.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleOpenModal(student)}
                                                    className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer mr-2"
                                                >
                                                    <IconEdit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(student.id)}
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <IconTrash size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No students found.</div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div key={student.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3 min-w-0">
                                    <img 
                                        src={student.profile_image_url ? (student.profile_image_url.startsWith('http') ? student.profile_image_url : `http://localhost:5000${student.profile_image_url}`) : `https://avatar.iran.liara.run/public/${student.gender?.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${student.first_name}+${student.last_name}`}
                                        alt="" 
                                        className="w-10 h-10 rounded-full shrink-0 bg-slate-100 dark:bg-slate-800 object-cover" 
                                    />
                                    <div className="overflow-hidden min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-base" title={`${student.first_name} ${student.last_name}`}>{student.first_name} {student.last_name}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate" title={student.email}>{student.email}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-400">Enrollment No.</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{student.enrollment_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-400">Gender</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{student.gender}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-400">Status</span>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${student.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {student.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-1">
                                        <button onClick={() => handleOpenModal(student)} className="px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg">Edit</button>
                                        <button onClick={() => handleDelete(student.id)} className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg">Delete</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <StudentOnboardingWizard 
                isOpen={isWizardOpen} 
                onClose={() => setIsWizardOpen(false)} 
                onSuccess={fetchStudents} 
            />
        </div>
    );
};

export default StudentList;
