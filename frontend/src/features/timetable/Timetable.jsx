import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconCalendarEvent, IconPlus, IconX, IconTrash, IconClock } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Timetable = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const isLecturer = user?.role === 'LECTURER';
    const isStudent = user?.role === 'STUDENT';

    const [slots, setSlots] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [studentGroups, setStudentGroups] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [lecturers, setLecturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // For admin creation
    const [formData, setFormData] = useState({
        course_id: '',
        student_group_id: '',
        lecturer_id: '',
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        room_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter controls
    const [filterGroup, setFilterGroup] = useState('');
    const [filterLecturer, setFilterLecturer] = useState('');
    const [filterRoom, setFilterRoom] = useState('');

    useEffect(() => {
        fetchSubjects();
        fetchCourses();
        fetchStudentGroups();
        fetchRooms();
        fetchLecturers();
    }, []);

    useEffect(() => {
        fetchTimetable();
    }, [filterGroup, filterLecturer, filterRoom]);

    const fetchStudentGroups = async () => {
        try {
            const response = await api.get('/student-groups');
            setStudentGroups(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchLecturers = async () => {
        try {
            const response = await api.get('/lecturers');
            setLecturers(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses');
            setCourses(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await api.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const response = await api.get('/subjects');
            setSubjects(response.data);
        } catch (error) {
            console.error('Failed to load subjects', error);
        }
    };

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            let url = '/timetable';
            const params = new URLSearchParams();
            if (filterGroup) params.append('student_group_id', filterGroup);
            if (filterLecturer) params.append('lecturer_id', filterLecturer);
            if (filterRoom) params.append('room_id', filterRoom);
            
            const response = await api.get(`${url}?${params.toString()}`);
            setSlots(response.data);
        } catch (error) {
            toast.error('Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/timetable', { ...formData });
            toast.success('Schedule created successfully');
            setIsModalOpen(false);
            setFormData({ course_id: '', student_group_id: '', lecturer_id: '', subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '', room_id: '' });
            fetchTimetable();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create schedule. Possible overlap.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this time slot?')) return;
        try {
            await api.delete(`/timetable/${id}`);
            toast.success('Schedule deleted');
            fetchTimetable();
        } catch (error) {
            toast.error('Failed to delete schedule');
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const d = new Date();
        d.setHours(h, m);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page w-full  box-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Master Timetable</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and view the weekly academic schedule.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors w-full md:w-auto cursor-pointer">
                        <IconPlus size={20} />
                        Add Schedule
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4 flex-wrap">
                <select 
                    className="px-4 py-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:border-primary-500"
                    value={filterGroup}
                    onChange={e => setFilterGroup(e.target.value)}
                >
                    <option value="">All Groups</option>
                    {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                <select 
                    className="px-4 py-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:border-primary-500"
                    value={filterRoom}
                    onChange={e => setFilterRoom(e.target.value)}
                >
                    <option value="">All Rooms</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                <input 
                    type="number" 
                    placeholder="Filter by Lecturer ID" 
                    value={filterLecturer} 
                    onChange={e => setFilterLecturer(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:border-primary-500"
                />
            </div>

            {/* Weekly Grid */}
            <div className="timetable-grid">
                {DAYS.map(day => {
                    const daySlots = slots.filter(s => s.day_of_week === day);
                    return (
                        <div key={day} className="glass min-w-0 p-4 rounded-xl shadow-sm flex flex-col h-full border border-slate-100 dark:border-slate-700/50">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-4">{day}</h2>
                            <div className="flex-1 flex flex-col gap-4">
                                {loading ? (
                                    <p className="text-slate-400 text-sm font-semibold text-center mt-5">Loading...</p>
                                ) : daySlots.length === 0 ? (
                                    <p className="text-slate-400 text-sm font-semibold text-center mt-5 italic">No classes scheduled</p>
                                ) : (
                                    daySlots.map(slot => (
                                        <div key={slot.id} className="bg-primary-50/50 dark:bg-slate-800/60 border border-primary-100/60 dark:border-slate-700/60 rounded-xl p-4 relative group min-w-0 overflow-hidden">
                                            {isAdmin && (
                                                <button onClick={() => handleDelete(slot.id)} className="absolute top-2 right-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                                    <IconTrash size={16} />
                                                </button>
                                            )}
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-normal pr-8 break-words" title={slot.course_name}>{slot.course_name}</h3>
                                            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-1 uppercase tracking-wider truncate" title={slot.student_group_name}>{slot.student_group_name}</p>
                                            
                                            <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                <IconClock size={14} className="text-slate-400 shrink-0" />
                                                <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                                            </div>
                                            <div className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 border-t border-primary-100/50 dark:border-slate-700/50 pt-2.5 min-w-0">
                                                <span className="truncate flex-1 min-w-0" title={slot.lecturer_name || slot.lecturer_email}>{slot.lecturer_name || slot.lecturer_email}</span>
                                                <span className="font-semibold bg-white dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700/50 truncate max-w-[120px] shrink-0" title={slot.room_name || 'TBA'}>{slot.room_name || 'TBA'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {isModalOpen && isAdmin && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Create Schedule Slot</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <form id="timetableForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Course</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})}>
                                            <option value="">Select Course</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Student Group</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.student_group_id} onChange={e => setFormData({...formData, student_group_id: e.target.value})}>
                                            <option value="">Select Group</option>
                                            {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Room / Lecture Hall</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})}>
                                            <option value="">Select Room</option>
                                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Lecturer</label>
                                        <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.lecturer_id} onChange={e => setFormData({...formData, lecturer_id: e.target.value})}>
                                            <option value="">Select Lecturer</option>
                                            {lecturers.map(t => <option key={t.id} value={t.id}>{t.email.split('@')[0]} ({t.department})</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Day of Week</label>
                                    <select required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})}>
                                        {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Start Time</label>
                                        <input required type="time" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">End Time</label>
                                        <input required type="time" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-slate-700 dark:text-slate-200" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                                    </div>
                                </div>

                            </form>
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                            <button form="timetableForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70 cursor-pointer">
                                {isSubmitting ? 'Saving...' : 'Save Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timetable;
