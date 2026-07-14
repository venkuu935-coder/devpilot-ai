import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';
import { Mail, Lock, ShieldAlert, Compass, Key, Eye, EyeOff, X, User } from 'lucide-react';

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" width="18" height="18">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const Login: React.FC = () => {
  const { login, googleLogin, verify2FA } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [simOtp, setSimOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Account Chooser
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    setSimOtp('');
    try {
      const res = await login(email, password);
      if (res && res.require2FA) {
        setRequire2FA(true);
        setTempToken(res.tempToken || '');
        if (res.otpCode) {
          setSimOtp(res.otpCode);
        }
        setMessage('A 2-step verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsLoading(true);
    setError('');
    try {
      await verify2FA(tempToken, code);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAccountSelect = async (selectedEmail: string) => {
    const username = selectedEmail.split('@')[0];
    setIsGoogleLoading(true);
    setError('');
    setMessage('');
    setSimOtp('');
    try {
      const res = await googleLogin(selectedEmail, username);
      if (res && res.require2FA) {
        setShowGoogleModal(false);
        setRequire2FA(true);
        setTempToken(res.tempToken || '');
        if (res.otpCode) {
          setSimOtp(res.otpCode);
        }
        setMessage('A 2-step verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      setShowGoogleModal(false);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const googleAccounts = [
    { email: 'venkuu935@gmail.com', name: 'Venkatesh', avatar: 'V' },
    { email: 'dev@devpilot.ai', name: 'Developer', avatar: 'D' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-650/15">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {require2FA ? 'Two-Step Verification' : 'Sign In to DevPilot'}
            </h2>
            <p className="text-xs text-slate-500">Autonomous software development assistant</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 animate-bounce" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center space-x-2">
            <Key className="h-4.5 w-4.5 shrink-0 animate-pulse" />
            <span>{message}</span>
          </div>
        )}

        {!require2FA ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="developer@devpilot.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : (isPasswordFocused || password ? "password" : "text")}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-11 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Authenticating Session...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest">or</span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl py-3 px-4 text-sm font-semibold text-slate-200 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <GoogleIcon />
              <span>Sign in with Google</span>
            </button>
          </>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                Verification Code
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none tracking-widest text-center font-mono transition-colors"
                />
              </div>
              {simOtp && (
                <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-left space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    Simulation OTP (No SMTP Setup Required)
                  </h4>
                  <p className="text-xs text-slate-400">
                    If you did not receive the email, enter the following code directly to complete verification:
                  </p>
                  <p className="text-center font-mono font-bold text-lg text-indigo-400 tracking-[6px] bg-slate-950 py-2 rounded-xl border border-slate-800">
                    {simOtp}
                  </p>
                </div>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Verifying Code...' : 'Verify and Sign In'}
            </Button>
            
            <button
              type="button"
              onClick={() => setRequire2FA(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-400 font-bold transition-colors pt-2"
            >
              Back to Sign In
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-850">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-350 font-bold hover:underline transition-colors">
            Register Workspace
          </Link>
        </div>
      </div>

      {/* Google Account Chooser Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowGoogleModal(false)}>
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <GoogleIcon className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">Choose an Account</h3>
              </div>
              <button onClick={() => setShowGoogleModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="px-6 text-xs text-slate-500 pb-4">to continue to <span className="font-bold text-slate-400">DevPilot AI</span></p>

            {/* Account List */}
            <div className="border-t border-slate-800">
              {googleAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleGoogleAccountSelect(account.email)}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-slate-800/70 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                    {account.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{account.name}</p>
                    <p className="text-xs text-slate-500 truncate">{account.email}</p>
                  </div>
                </button>
              ))}

              {/* Custom Email Input */}
              <div className="border-t border-slate-800 px-6 py-4 space-y-3">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Use another account</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="your@gmail.com"
                      value={googleCustomEmail}
                      onChange={(e) => setGoogleCustomEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (googleCustomEmail) handleGoogleAccountSelect(googleCustomEmail);
                    }}
                    disabled={!googleCustomEmail || isGoogleLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800">
              <p className="text-[9px] text-slate-600 text-center">
                Secured by DevPilot Authentication · 2-Step Verification Required
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
