import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './features/auth/Login';
import ForcePasswordChange from './features/auth/ForcePasswordChange';

// Pages load on demand so the first screen does not download every feature (charts, finance, library...).
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const StudentList = lazy(() => import('./features/students/StudentList'));
const UserList = lazy(() => import('./features/users/UserList'));
const Settings = lazy(() => import('./features/settings/Settings'));
const LecturerList = lazy(() => import('./features/lecturers/LecturerList'));
const RoomList = lazy(() => import('./features/rooms/RoomList'));
const StudentGroupList = lazy(() => import('./features/student_groups/StudentGroupList'));
const AttendancePortal = lazy(() => import('./features/attendance/AttendancePortal'));
const Gradebook = lazy(() => import('./features/grades/Gradebook'));
const MaterialUpload = lazy(() => import('./features/materials/MaterialUpload'));
const StaffAttendance = lazy(() => import('./features/attendance/StaffAttendance'));
const Timetable = lazy(() => import('./features/timetable/Timetable'));
const GatekeeperDashboard = lazy(() => import('./features/attendance/GatekeeperDashboard'));
const BroadcastCenter = lazy(() => import('./features/notifications/BroadcastCenter'));
const StudentResults = lazy(() => import('./features/results/StudentResults'));
const FinanceDashboard = lazy(() => import('./features/finance/FinanceDashboard'));
const LibraryDashboard = lazy(() => import('./features/library/LibraryDashboard'));
const CourseList = lazy(() => import('./features/courses/CourseList'));
const ProgramList = lazy(() => import('./features/programs/ProgramList'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
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
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ForcePasswordChange />} />
            
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
          </Suspense>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
