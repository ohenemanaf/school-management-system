import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import LecturerDashboard from './LecturerDashboard';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
    const { user } = useAuth();
    
    const normalizedRole = user?.role?.toUpperCase().replace(' ', '_');
    
    if (['SUPER_ADMIN', 'HEADMASTER', 'ADMIN'].includes(normalizedRole)) return <AdminDashboard />;
    if (normalizedRole === 'ACCOUNTANT') return <Navigate to="/admin/finance" replace />;
    if (normalizedRole === 'LIBRARIAN') return <Navigate to="/admin/library" replace />;
    if (normalizedRole === 'LECTURER') return <LecturerDashboard />;
    if (normalizedRole === 'STUDENT') return <StudentDashboard />;
    if (normalizedRole === 'GATEKEEPER') return <Navigate to="/gatekeeper" replace />;
    
    return <div className="p-10 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Unhandled Role</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Your role "{user?.role}" ({normalizedRole}) is not assigned to a specific dashboard.</p>
    </div>;
};
export default Dashboard;
