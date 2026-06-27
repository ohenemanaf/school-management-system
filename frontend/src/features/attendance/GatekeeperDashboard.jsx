import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { IconShieldCheck, IconLogout } from '@tabler/icons-react';

const GatekeeperDashboard = () => {
    const { user, logout } = useAuth();
    const [token, setToken] = useState('...');
    const [loading, setLoading] = useState(true);

    if (user?.role !== 'GATEKEEPER' && user?.role !== 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    const fetchToken = async () => {
        try {
            const res = await api.get('/attendance/gate-token');
            setToken(res.data.token);
        } catch (error) {
            console.error('Failed to fetch token', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToken();
        // Poll every 5 seconds to get a new token if the old one is consumed or expired
        const interval = setInterval(fetchToken, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background glowing effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/20 blur-[120px] rounded-full pointer-events-none"></div>

            <button 
                onClick={logout}
                className="absolute top-6 right-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md cursor-pointer"
            >
                <IconLogout size={20} />
                <span className="font-bold text-sm">Logout</span>
            </button>

            <div className="flex flex-col items-center z-10">
                <div className="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-8">
                    <IconShieldCheck size={40} className="text-white" />
                </div>
                
                <h1 className="text-3xl font-bold text-slate-300 mb-2 uppercase tracking-widest">Gatekeeper Active</h1>
                <p className="text-slate-400 font-medium mb-12">Lecturers must enter this code to check in</p>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 md:p-16 rounded-[3rem] shadow-2xl flex items-center justify-center min-w-[300px] md:min-w-[500px]">
                    {loading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="h-20 w-40 bg-white/20 rounded-2xl"></div>
                        </div>
                    ) : (
                        <span className="text-7xl md:text-9xl font-black text-white tracking-[0.2em] font-mono drop-shadow-2xl">{token}</span>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Auto-refreshing Live Token
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GatekeeperDashboard;
