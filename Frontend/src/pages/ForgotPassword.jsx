import { useState } from 'react';
import { post } from '../lib/api';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowLeft,
  Shield,
  Key,
  Send
} from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(''); 
    setMsg('');
    
    if (!email.trim()) {
      setErr('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await post('/api/auth/forgot-password', { email });
      
      // Success state
      setSent(true);
      setMsg('If that email exists in our system, a reset link has been sent to your inbox.');
      
      // Clear success message after 10 seconds
      setTimeout(() => {
        setMsg('');
        setSent(false);
      }, 10000);
    } catch (e2) {
      setErr(e2?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Toast Notifications */}
      {msg && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-sm">
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

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Key size={28} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600 text-lg">We'll send you a secure reset link</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-900/10 rounded-3xl border border-white/20 p-8 sm:p-10">
          
          {sent ? (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Send size={32} className="text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Check Your Email</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We've sent password reset instructions to <span className="font-semibold text-gray-900">{email}</span>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Mail size={16} />
                  <span className="text-sm font-medium">What's next?</span>
                </div>
                <ul className="text-xs text-blue-600 space-y-1 text-left">
                  <li>• Check your email inbox (and spam folder)</li>
                  <li>• Click the reset link within 15 minutes</li>
                  <li>• Create your new secure password</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                    setMsg('');
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Try Different Email
                </button>
                
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <ArrowLeft size={18} />
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Email</h3>
                <p className="text-gray-600">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Send size={18} />
                    <span>Send Reset Link</span>
                  </div>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  <ArrowLeft size={16} />
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
            <span className="font-medium text-gray-700">Secure Password Reset</span>
          </div>
          <p>
            Reset links expire in 15 minutes for security. 
            If you don't receive an email, check your spam folder or contact support.
          </p>
        </div>

        {/* Alternative Actions */}
        <div className="text-center mt-6">
          <div className="text-sm text-gray-600 mb-3">Need help?</div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/signup"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors duration-200"
            >
              Create New Account
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a
              href="mailto:support@deductive.com"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors duration-200"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
