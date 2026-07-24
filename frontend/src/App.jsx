import { Navigate, Route, Routes, Outlet } from 'react-router-dom';

import Login from "./components/login";
import Admin from './pages/Admin';
import ContestCreate from './pages/admin/ContestCreate';
import ContestManagement from './pages/admin/ContestManagement';
import ContestView from './pages/admin/ContestView';
import Logs from './pages/admin/Logs';
import ProblemAdd from './pages/admin/ProblemAdd';
import ProblemManagement from './pages/admin/ProblemManagement';
import ProblemView from './pages/admin/ProblemView';
import UserManagement from './pages/admin/UserManagement';
import UserList from './pages/admin/UserList';
import GroupList from './pages/admin/GroupList';
import GroupAdd from './pages/admin/GroupAdd';
import UserView from './pages/admin/UserView';
import NoticeManagement from './pages/admin/NoticeManagement';
import UserDashboard from './pages/user/UserDashboard';
import UserPractice from './pages/user/UserPractice';
import UserContests from './pages/user/UserContests';
import UserContestDetails from './pages/user/UserContestDetails';
import UserProfile from './pages/user/UserProfile';
import User from './pages/User';


function ProtectedRoute({ allowedRoles }) {
  const activeUserId = localStorage.getItem('demo_active_user_id');
  const activeUserRole = localStorage.getItem('demo_active_user_role');

  if (!activeUserId) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeUserRole)) {
    return <Navigate to="/user" replace />;
  }

  return <Outlet />;
}

export default function App() {
  
  return (
    <div className="min-h-screen text-slate-100">
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* User Portal Routes (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Moderator', 'Contestant']} />}>
          <Route path="/" element={<Navigate to="/user" replace />} />
          <Route path="/user" element={<UserDashboard />} />
          <Route path="/user/practice" element={<UserPractice />} />
          <Route path="/user/contests" element={<UserContests />} />
          <Route path="/user/contests/:contestId" element={<UserContestDetails />} />
          <Route path="/user/profile" element={<UserProfile />} />
          <Route path="/user/problems/:problemId" element={<User />} />
        </Route>

        {/* Admin Portal Routes (Protected to Admin and Moderator) */}
        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Moderator']} />}>
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/problem-management" element={<ProblemManagement />} />
          <Route path="/admin/problem-management/add" element={<ProblemAdd />} />
          <Route path="/admin/problem-management/:problemId" element={<ProblemView />} />
          <Route path="/admin/user-management" element={<UserManagement />} />
          <Route path="/admin/user-management/users" element={<UserList />} />
          <Route path="/admin/user-management/:userId" element={<UserView />} />
          <Route path="/admin/group-management" element={<GroupList />} />
          <Route path="/admin/group-management/add" element={<GroupAdd />} />
          <Route path="/admin/group-management/:groupId" element={<GroupAdd />} />
          <Route path="/admin/contest-management" element={<ContestManagement />} />
          <Route path="/admin/contest-management/create" element={<ContestCreate />} />
          <Route path="/admin/contest-management/:contestId" element={<ContestView />} />
          <Route path="/admin/logs" element={<Logs />} />
          <Route path="/admin/notices" element={<NoticeManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

