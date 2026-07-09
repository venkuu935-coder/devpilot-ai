import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const msg = await forgotPassword(email);
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Reset Password</h2>
          <p className="text-xs text-slate-450 leading-relaxed">
            Enter your email address and we will construct a simulated password recovery token.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                <span>Simulation Token Constructed!</span>
              </div>
              <p className="font-sans text-[11px] leading-relaxed text-slate-400">
                {success}
              </p>
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. developer@devpilot.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Compiling Reset Key...' : 'Send Recovery Token'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
