import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AdminLayout from './layouts/AdminLayout';
import Login from './features/auth/Login';
import ForcePasswordChange from './features/auth/ForcePasswordChange';
import { can } from './config/permissions';

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
const Performance = lazy(() => import('./features/performance/Performance'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
};

const RequirePermission = ({ children, perm }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!can(user, perm)) return <Navigate to="/admin" replace />;
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
              <Route path="timetable" element={<RequirePermission perm="page.timetable"><Timetable /></RequirePermission>} />
              <Route path="attendance" element={<RequirePermission perm="page.attendance"><AttendancePortal /></RequirePermission>} />
              <Route path="staff-attendance" element={<RequirePermission perm="page.staffAttendance"><StaffAttendance /></RequirePermission>} />
              <Route path="grades" element={<RequirePermission perm="page.gradebook"><Gradebook /></RequirePermission>} />
              <Route path="materials" element={<RequirePermission perm="page.materials"><MaterialUpload /></RequirePermission>} />
              <Route path="students" element={<RequirePermission perm="page.students"><StudentList /></RequirePermission>} />
              <Route path="users" element={<RequirePermission perm="page.users"><UserList /></RequirePermission>} />
              <Route path="lecturers" element={<RequirePermission perm="page.lecturers"><LecturerList /></RequirePermission>} />
              <Route path="courses" element={<RequirePermission perm="page.academics"><CourseList /></RequirePermission>} />
              <Route path="programs" element={<RequirePermission perm="page.academics"><ProgramList /></RequirePermission>} />
              <Route path="student-groups" element={<RequirePermission perm="page.groups"><StudentGroupList /></RequirePermission>} />
              <Route path="rooms" element={<RequirePermission perm="page.academics"><RoomList /></RequirePermission>} />
              <Route path="settings" element={<Settings />} />
              <Route path="broadcast" element={<RequirePermission perm="page.broadcast"><BroadcastCenter /></RequirePermission>} />
              <Route path="performance" element={<RequirePermission perm="page.performance"><Performance /></RequirePermission>} />
              <Route path="results" element={<RequirePermission perm="page.results"><StudentResults /></RequirePermission>} />
              <Route path="finance" element={<RequirePermission perm="page.finance"><FinanceDashboard /></RequirePermission>} />
              <Route path="library" element={<RequirePermission perm="page.library"><LibraryDashboard /></RequirePermission>} />
            </Route>
          </Routes>
          </Suspense>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
