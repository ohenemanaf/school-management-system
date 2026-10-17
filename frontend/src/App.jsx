import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import StudentList from './features/students/StudentList';
import UserList from './features/users/UserList';
import Settings from './features/settings/Settings';
import LecturerList from './features/lecturers/LecturerList';
import RoomList from './features/rooms/RoomList';
import StudentGroupList from './features/student_groups/StudentGroupList';
import AttendancePortal from './features/attendance/AttendancePortal';
import Gradebook from './features/grades/Gradebook';
import MaterialUpload from './features/materials/MaterialUpload';
import StaffAttendance from './features/attendance/StaffAttendance';
import Timetable from './features/timetable/Timetable';
import GatekeeperDashboard from './features/attendance/GatekeeperDashboard';
import BroadcastCenter from './features/notifications/BroadcastCenter';
import StudentResults from './features/results/StudentResults';
import FinanceDashboard from './features/finance/FinanceDashboard';
import LibraryDashboard from './features/library/LibraryDashboard';
import CourseList from './features/courses/CourseList';
import ProgramList from './features/programs/ProgramList';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RequireRole = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/gatekeeper" element={
              <ProtectedRoute>
                <GatekeeperDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="timetable" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT']}><Timetable /></RequireRole>} />
              <Route path="attendance" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']}><AttendancePortal /></RequireRole>} />
              <Route path="staff-attendance" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']}><StaffAttendance /></RequireRole>} />
              <Route path="grades" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']}><Gradebook /></RequireRole>} />
              <Route path="materials" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'STUDENT']}><MaterialUpload /></RequireRole>} />
              <Route path="students" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER', 'ACCOUNTANT']}><StudentList /></RequireRole>} />
              <Route path="users" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'ADMIN']}><UserList /></RequireRole>} />
              <Route path="lecturers" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']}><LecturerList /></RequireRole>} />
              <Route path="courses" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']}><CourseList /></RequireRole>} />
              <Route path="programs" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']}><ProgramList /></RequireRole>} />
              <Route path="student-groups" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LECTURER']}><StudentGroupList /></RequireRole>} />
              <Route path="rooms" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN']}><RoomList /></RequireRole>} />
              <Route path="settings" element={<Settings />} />
              <Route path="broadcast" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT']}><BroadcastCenter /></RequireRole>} />
              <Route path="results" element={<RequireRole allowedRoles={['STUDENT']}><StudentResults /></RequireRole>} />
              <Route path="finance" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'ACCOUNTANT', 'STUDENT']}><FinanceDashboard /></RequireRole>} />
              <Route path="library" element={<RequireRole allowedRoles={['SUPER_ADMIN', 'HEADMASTER', 'ADMIN', 'LIBRARIAN', 'STUDENT', 'LECTURER']}><LibraryDashboard /></RequireRole>} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
