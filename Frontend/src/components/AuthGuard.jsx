// src/components/AuthGuard.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// AuthGuard.jsx
export function RedirectIfAuthenticated({ children }) {
  const { user, booted } = useAuth();
  
  // Wait for auth to load
  if (!booted) return null;
  
  // Only redirect if user is authenticated AND verified
  if (user && user.verified) {
    return <Navigate to="/" replace />;
  }
  
  // Allow access for non-authenticated users and unverified users
  return children;
}


// AuthGuard.jsx
export function RequireAuth({ children }) {
  const { user, booted } = useAuth();
  
  if (!booted) return null;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Don't redirect here - let the verification flow handle itself
  // The login process will redirect to verification when needed
  return children;
}

