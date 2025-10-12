import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const params = new URLSearchParams(loc.search);
  const next = params.get('next') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // Login.jsx - Update the onSubmit function
const onSubmit = async (e) => {
  e.preventDefault();
  if (loading) return;
  setErr('');
  
  try {
    setLoading(true);
    const isEmail = identifier.includes('@');
    
    await login({
      email: isEmail ? identifier : undefined,
      username: isEmail ? undefined : identifier,
      password,
    });
    
    navigate(next, { replace: true });
  } catch (e2) {
    console.log('Login error:', e2); // Debug log
    
    const msg = e2?.message || 'Login failed';
    
    // Handle already authenticated case
    if (msg === 'Already authenticated') {
      navigate('/', { replace: true });
      return;
    }
    
    // Check for verification needed - simplified check
    const errorData = e2?.response?.data || e2?.data || {};
    console.log('Error data:', errorData); // Debug log
    
    if (errorData?.needVerification && errorData?.email) {
      console.log('Redirecting to verification:', errorData.email); // Debug log
      navigate(`/verify-email-code?email=${encodeURIComponent(errorData.email)}`, { replace: true });
      return;
    }
    
    setErr(msg);
  } finally {
    setLoading(false);
  }
};



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-600">Sign in to continue to Deductive</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 backdrop-blur-xl shadow-2xl shadow-gray-900/10 rounded-2xl border border-white/20 p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Error Message */}
            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {err}
              </div>
            )}

            {/* Username/Email Input */}
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <input
                id="identifier"
                type="text"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">New to Deductive?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full py-3 px-6 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 transform hover:scale-[1.02]"
            >
              Create an account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          By signing in, you agree to our{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
