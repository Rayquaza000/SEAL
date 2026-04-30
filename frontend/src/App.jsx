import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import MyTasks from './pages/MyTasks';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Employees from './pages/Employees';
import Templates from './pages/Templates';
import AcceptInvite from './pages/AcceptInvite';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin rounded-full h-10 w-10 border-t-2" style={{ borderColor: '#e57373' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/invite/:token" element={<AcceptInvite />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="products"   element={<Products />} />
            <Route path="my-tasks"   element={<MyTasks />} />
            <Route path="inventory"  element={<Inventory />} />
            <Route path="billing"    element={<Billing />} />
            <Route path="employees"  element={<Employees />} />
            <Route path="templates"  element={<Templates />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
