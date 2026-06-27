import { useState, useEffect } from 'react';
import { IconX, IconUser, IconSchool, IconHeartbeat, IconCheck, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const STEPS = [
    { id: 1, title: 'Personal Info', icon: <IconUser size={20} /> },
    { id: 2, title: 'Academic Placement', icon: <IconSchool size={20} /> },
    { id: 3, title: 'Guardian & Health', icon: <IconHeartbeat size={20} /> },
    { id: 4, title: 'Review', icon: <IconCheck size={20} /> }
];

const StudentOnboardingWizard = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', dateOfBirth: '', gender: 'Male',
        address: '', guardianName: '', guardianPhone: '', medicalConditions: '', bloodGroup: '',
        studentGroupId: ''
    });
    
    // Academic Hierarchy State
    const [studentGroups, setStudentGroups] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchStudentGroups();
            setStep(1);
            setFormData({
                firstName: '', lastName: '', email: '', dateOfBirth: '', gender: 'Male',
                address: '', guardianName: '', guardianPhone: '', medicalConditions: '', bloodGroup: '',
                studentGroupId: ''
            });
        }
    }, [isOpen]);

    const fetchStudentGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setStudentGroups(response.data);
        } catch (error) {
            console.error('Failed to load student groups', error);
        }
    };

    if (!isOpen) return null;

    const handleNext = () => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.dateOfBirth) {
                return toast.error("Please fill all required personal fields.");
            }
        }
        if (step === 2) {
            if (!formData.studentGroupId) {
                return toast.error("Please complete academic placement.");
            }
        }
        setStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await api.post('/students', formData);
            toast.success('Student enrolled successfully! Welcome email sent.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to enroll student');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Student Onboarding</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Enroll a new student securely</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm">
                        <IconX size={20} />
                    </button>
                </div>

                {/* Progress Tracker */}
                <div className="px-8 pt-6 pb-2 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full -z-10"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-500 rounded-full -z-10 transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}></div>
                        
                        {STEPS.map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-800 px-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s.id ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-white dark:border-slate-700/50'}`}>
                                    {step > s.id ? <IconCheck size={18} /> : s.icon}
                                </div>
                                <span className={`text-xs font-bold hidden sm:block ${step >= s.id ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-800 min-h-[300px]">
                    
                    {/* STEP 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-2">Basic Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">First Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="john.doe@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                                    <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium cursor-pointer">
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Academic Placement */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-2">School Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Student Group / Cohort <span className="text-red-500">*</span></label>
                                    <select value={formData.studentGroupId} onChange={e => setFormData({...formData, studentGroupId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium cursor-pointer">
                                        <option value="">Select Group...</option>
                                        {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Guardian & Health */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-2">Emergency Contacts</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Guardian Name</label>
                                    <input type="text" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="Jane Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Guardian Phone</label>
                                    <input type="tel" value={formData.guardianPhone} onChange={e => setFormData({...formData, guardianPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="+1 234 567 890" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Home Address</label>
                                    <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" rows="2"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Medical Conditions (if any)</label>
                                    <input type="text" value={formData.medicalConditions} onChange={e => setFormData({...formData, medicalConditions: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium" placeholder="Asthma, Peanuts Allergy..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Blood Group</label>
                                    <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium cursor-pointer">
                                        <option value="">Select...</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Review */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <IconCheck size={32} />
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Ready to Enroll!</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                                    You are about to register <span className="font-bold text-slate-700 dark:text-slate-200">{formData.firstName} {formData.lastName}</span> into the system. 
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <IconUser size={18} className="text-primary-500" /> Auto-Generated Credentials
                                </h4>
                                <ul className="space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    <li className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <span>Index / Enrollment Number:</span>
                                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs font-mono font-bold">Auto-Generated</span>
                                    </li>
                                    <li className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <span>Temporary Password:</span>
                                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs font-mono font-bold">Secure Random (8 chars)</span>
                                    </li>
                                    <li className="flex items-center justify-between">
                                        <span>Delivery Method:</span>
                                        <span className="flex items-center gap-1 text-slate-800 dark:text-slate-100"><IconCheck size={14} className="text-emerald-500"/> Sent to {formData.email}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <button 
                        onClick={handleBack} 
                        disabled={step === 1 || isSubmitting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                        <IconChevronLeft size={18} /> Back
                    </button>

                    {step < 4 ? (
                        <button 
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-200 transition-colors cursor-pointer"
                        >
                            Next <IconChevronRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-colors cursor-pointer disabled:opacity-70"
                        >
                            {isSubmitting ? 'Enrolling...' : 'Confirm & Enroll'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentOnboardingWizard;
