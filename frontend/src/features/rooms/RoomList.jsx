import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { IconBuilding, IconPlus, IconX, IconTrash } from '@tabler/icons-react';
import toast from 'react-hot-toast';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', capacity: 30 });
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            toast.error('Failed to load rooms');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/rooms', formData);
            toast.success('Room created successfully');
            setIsModalOpen(false);
            setFormData({ name: '', capacity: 30 });
            fetchRooms();
        } catch (error) {
            toast.error('Failed to create room');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this room?')) return;
        try {
            await api.delete(`/rooms/${id}`);
            toast.success('Room deleted');
            fetchRooms();
        } catch (error) {
            toast.error('Failed to delete room');
        }
    };

    return (
        <div className="page w-full  box-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Rooms / Lecture Halls</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage all physical spaces.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors w-full md:w-auto cursor-pointer">
                        <IconPlus size={20} />
                        Add Room
                    </button>
                )}
            </div>

            <div className="catalog-grid">
                {loading ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">Loading rooms...</p>
                ) : rooms.length === 0 ? (
                    <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">No rooms found.</p>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="catalog-card glass p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 relative group flex items-start gap-4 min-w-0 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                <IconBuilding size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight break-words" title={room.name}>{room.name}</h3>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Capacity: {room.capacity} seats</p>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDelete(room.id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer shrink-0">
                                    <IconTrash size={18} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && isAdmin && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-xl">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Add New Room</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer">
                                <IconX size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Room Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-3 font-medium transition-colors"
                                    placeholder="e.g. Lecture Hall 1"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Capacity</label>
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-3 font-medium transition-colors"
                                    placeholder="e.g. 50"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-50 dark:bg-slate-900/50 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors cursor-pointer">
                                    Save Room
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomList;
