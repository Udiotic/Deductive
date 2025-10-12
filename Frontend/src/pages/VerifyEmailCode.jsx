import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { post } from '../lib/api';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowRight,
  Shield,
  Sparkles
} from 'lucide-react';

export default function VerifyEmailCode() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const emailLocked = Boolean(initialEmail);

  const [code, setCode] = useState(Array(6).fill(''));
  const inputs = Array.from({ length: 6 }, () => useRef(null));
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => { 
    inputs[0].current?.focus(); 
  }, []);

  const handleChange = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = d || '';
    setCode(next);
    if (d && i < 5) inputs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs[i - 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = Array(6).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setCode(next);
    inputs[Math.min(text.length, 5)].current?.focus();
  };

  async function submit() {
    const joined = code.join('');
    if (!email) { 
      setMsg('Email address is required'); 
      setOk(false);
      return; 
    }
    if (joined.length !== 6) { 
      setMsg('Please enter all 6 digits'); 
      setOk(false);
      return; 
    }
    
    try {
      setLoading(true);
      setMsg('');
      
      const response = await post('/api/auth/verify-email-code', { email, code: joined });
      
      if (response.ok && response.user) {
        setOk(true);
        setShowSuccess(true);
        setMsg('Email verified successfully!');
        
        // Refresh auth context with new user data
        await refreshUser();
        
        // Redirect after showing success animation
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        setOk(false);
        setMsg('Invalid verification code. Please try again.');
      }
    } catch (e) {
      setOk(false);
      setMsg(e?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) { 
      setMsg('Email address is required'); 
      setOk(false);
      return; 
    }
    
    try {
      setResending(true);
      setMsg('');
      await post('/api/auth/resend-verify-code', { email });
      setMsg('New verification code sent to your email!');
      setOk(true);
      
      // Clear the current code inputs
      setCode(Array(6).fill(''));
      inputs[0].current?.focus();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMsg('');
        setOk(false);
      }, 3000);
    } catch (e) {
      setMsg(e?.message || 'Failed to send verification code.');
      setOk(false);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Success Celebration Animation */}
      {showSuccess && (
        <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="animate-bounce">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle size={32} className="text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Mail size={28} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600 text-lg">We've sent a 6-digit code to your email address</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-900/10 rounded-3xl border border-white/20 p-8 sm:p-10">
          
          {/* Email Display */}
          {emailLocked ? (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl">
                <Mail size={18} className="text-gray-400" />
                <span className="text-gray-700 font-medium">{email}</span>
              </div>
            </div>
          ) : (
            <div className="mb-8">
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
                />
              </div>
            </div>
          )}

          {/* Verification Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter Verification Code
            </label>
            <div 
              className="flex justify-center gap-3 mb-4" 
              onPaste={handlePaste}
            >
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={inputs[i]}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white/60"
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          {/* Status Message */}
          {msg && (
            <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 ${
              ok 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {ok ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-medium">{msg}</span>
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={submit}
            disabled={loading || code.join('').length !== 6}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md mb-4"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw size={20} className="animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : showSuccess ? (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle size={20} />
                <span>Verified!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Verify Email</span>
                <ArrowRight size={18} />
              </div>
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the code?
            </p>
            <button
              onClick={resend}
              disabled={resending}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200 disabled:opacity-50"
            >
              {resending ? (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Resend verification code'
              )}
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-6 text-xs text-gray-500 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield size={16} className="text-indigo-500" />
            <span className="font-medium text-gray-700">Secure Verification</span>
          </div>
          <p>
            This code expires in 15 minutes for your security. 
            Check your spam folder if you don't see the email.
          </p>
        </div>
      </div>
    </div>
  );
}
