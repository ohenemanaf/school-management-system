import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleDashboard from './RoleDashboard';
import LecturerDashboard from './LecturerDashboard';
import StudentDashboard from './StudentDashboard';

// Each role has its own home screen; what goes on it is decided by the API
// (GET /api/dashboard), so a dashboard never shows data the role may not see.
const Dashboard = () => {
    const { user } = useAuth();
    switch (user?.role) {
        case 'LECTURER': return <LecturerDashboard />;
        case 'STUDENT': return <StudentDashboard />;
        case 'GATEKEEPER': return <Navigate to="/gatekeeper" replace />;
        case 'SUPER_ADMIN':
        case 'ADMIN':
        case 'HEADMASTER':
        case 'ACCOUNTANT':
        case 'LIBRARIAN':
            return <RoleDashboard />;
        default:
            return (
                <div className="p-10 text-center">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">No dashboard for this role</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Ask the super admin to check your account&apos;s role.</p>
                </div>
            );
    }
};

export default Dashboard;
