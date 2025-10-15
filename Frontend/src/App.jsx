// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Play from './pages/Play';
import UploadTest from './pages/UploadTest';
import EditorPlayground from './pages/EditorPlayground';
import Profile from './pages/Profile';
import AdminReview from './pages/AdminReview';
import PublicProfile from './pages/PublicProfile';
import VerifyEmailCode from './pages/VerifyEmailCode';
import { RedirectIfAuthenticated } from './components/AuthGuard';
import Header from './components/Header';
import GameModeSelection from './pages/GameModeSelection';


//QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000,    // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,      // ✅ This was causing refresh to refetch
      refetchOnReconnect: false,  // ✅ Don't refetch on reconnect
      retry: false,
    },
  },
});

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

function RequireAuth({ children }) {
  const { user, booted } = useAuth();
  if (!booted) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
                  element={<ResetPassword />} 
                />
                
                <Route path="/verify-email-code" element={<VerifyEmailCode />} />
                
                {/* Protected pages */}
                <Route 
                  path="/play" 
                  element={
                    <RequireAuth>
                      <GameModeSelection />
                    </RequireAuth>
                  } 
                />
                <Route 
                  path="/play/casual-solo" 
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
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BootGate>
          </main>
        </BrowserRouter>
      </AuthProvider>
      {/* ✅ Add DevTools for monitoring cache performance */}
      <ReactQueryDevtools initialIsOpen={true} />
    </QueryClientProvider>
  );
}
