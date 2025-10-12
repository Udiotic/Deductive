import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { post } from '../lib/api';
import { 
  Lock, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Check
} from 'lucide-react';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = params.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  // Password strength validation
  const getPasswordStrength = (pwd) => {
    if (pwd.length < 6) return { strength: 'weak', color: 'red', text: 'Too short' };
    if (pwd.length < 8) return { strength: 'fair', color: 'yellow', text: 'Fair' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)) return { strength: 'good', color: 'blue', text: 'Good' };
    return { strength: 'strong', color: 'green', text: 'Strong' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(''); 
    setMsg('');
    
    if (!token.trim()) {
      setErr('Reset token is required');
      return;
    }
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await post('/api/auth/reset-password', { token, password });
      setOk(true);
      setShowSuccess(true);
      setMsg('Password has been reset successfully!');
      
      // Auto-redirect after showing success
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (e2) {
      setErr(e2?.message || 'Reset failed. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Toast Notifications */}
      {msg && ok && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span className="font-medium text-sm">{msg}</span>
          </div>
        </div>
      )}

      {err && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
            <AlertCircle size={20} />
            <span className="font-medium text-sm">{err}</span>
          </div>
        </div>
      )}

      {/* Success Celebration Animation */}
      {showSuccess && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="animate-bounce">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-2xl">
              <Check size={32} className="text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Create New Password</h1>
          <p className="text-gray-600 text-lg">Choose a strong password for your account</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-900/10 rounded-3xl border border-white/20 p-8 sm:p-10">
          
          {ok ? (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle size={32} className="text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Password Reset Complete!</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-emerald-700 font-medium">
                  Redirecting to login page in a few seconds...
                </p>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                <span>Continue to Login</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Set Your New Password</h3>
                <p className="text-gray-600">
                  Please create a strong password that you haven't used before.
                </p>
              </div>

              {/* Token Input (if not in URL) */}
              {!tokenFromUrl && (
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                    Reset Token
                  </label>
                  <div className="relative">
                    <Key size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      id="token"
                      type="text"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="Enter reset token from email"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* New Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.color === 'red' ? 'bg-red-500 w-1/4' :
                            passwordStrength.color === 'yellow' ? 'bg-yellow-500 w-2/4' :
                            passwordStrength.color === 'blue' ? 'bg-blue-500 w-3/4' :
                            'bg-green-500 w-full'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.color === 'red' ? 'text-red-600' :
                        passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                        passwordStrength.color === 'blue' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`w-full pl-12 pr-12 py-3 bg-gray-50/50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 ${
                      confirm && password !== confirm ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Confirm your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {confirm && (
                  <div className={`mt-2 flex items-center gap-2 text-xs ${
                    password === confirm ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {password === confirm ? (
                      <>
                        <CheckCircle size={14} />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !token.trim() || password.length < 6 || password !== confirm}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Resetting Password...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Lock size={18} />
                    <span>Reset Password</span>
                  </div>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center mt-6 text-xs text-gray-500 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield size={16} className="text-indigo-500" />
            <span className="font-medium text-gray-700">Security Tips</span>
          </div>
          <ul className="text-left space-y-1">
            <li>• Use a mix of letters, numbers, and symbols</li>
            <li>• Make it at least 8 characters long</li>
            <li>• Don't reuse passwords from other accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
