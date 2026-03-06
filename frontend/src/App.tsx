import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Intelligence from './pages/Intelligence';
import Admin from './pages/Admin';
import { useAuthStore } from './stores/auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/*
          Protected shell — Layout contains <Outlet />.
          ALL pages that need the nav/sidebar live as children here.
          This is why /admin was blank: it must be a child of this route,
          not a sibling. The <Outlet /> in Layout renders whichever child
          route is currently active.
        */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="intelligence" element={<Intelligence />} />
          <Route path="admin" element={<Admin />} />

          {/* Catch-all: redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
