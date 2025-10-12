// src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Play from './pages/Play';
import UploadTest from './pages/UploadTest';
import EditorPlayground from './pages/EditorPlayground';
import { useNavigate } from 'react-router-dom';
import Profile from './pages/Profile';
import AdminReview from './pages/AdminReview';
import PublicProfile from './pages/PublicProfile';
import VerifyEmailCode from './pages/VerifyEmailCode';
import { RedirectIfAuthenticated } from './components/AuthGuard';
import Header from './components/Header';

function RequireRole({ roles, children }) {
  const { user, booted } = useAuth();
  if (!booted) return null;
  if (!user) return <Navigate to="/login" replace />;
  const ok = roles.includes(String(user.role || '').toLowerCase());
  return ok ? children : <Navigate to="/" replace />;
}


function BootGate({ children }) {
  const { booted } = useAuth();
  if (!booted) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }
  return children;
}

// Example guard if you later add protected pages
function RequireAuth({ children }) {
  const { user, booted } = useAuth();
  if (!booted) return null; // BootGate already handles loading UI
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <BootGate>
            <Routes>
              <Route path="/" element={<Home />} />
              
              {/* Auth pages - redirect if already authenticated */}
              <Route 
                path="/login" 
                element={
                  <RedirectIfAuthenticated>
                    <Login />
                  </RedirectIfAuthenticated>
                } 
              />
              <Route 
                path="/signup" 
                element={
                  <RedirectIfAuthenticated>
                    <Signup />
                  </RedirectIfAuthenticated>
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  <RedirectIfAuthenticated>
                    <ForgotPassword />
                  </RedirectIfAuthenticated>
                } 
              />
              <Route 
                path="/reset-password" 
                element={
                    <ResetPassword />
                } 
              />
              
              {/* Special case: verification page */}
              <Route path="/verify-email-code" element={<VerifyEmailCode />} />
              
              {/* Protected pages - require authentication */}
              <Route 
                path="/play" 
                element={
                  <RequireAuth>
                    <Play />
                  </RequireAuth>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                } 
              />
              <Route 
                path="/editor-test" 
                element={
                  <RequireAuth>
                    <EditorPlayground />
                  </RequireAuth>
                } 
              />
              
              {/* Admin routes */}
              <Route 
                path="/admin/review" 
                element={
                  <RequireRole roles={['admin', 'moderator']}>
                    <AdminReview />
                  </RequireRole>
                }
              />
              
              {/* Public routes */}
              <Route path="/upload-test" element={<UploadTest />} />
              <Route path="/profile/:username" element={<PublicProfile />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BootGate>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
