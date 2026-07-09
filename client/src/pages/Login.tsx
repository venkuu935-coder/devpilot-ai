import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';
import { Mail, Lock, ShieldAlert, Compass } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-650/15">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sign In to DevPilot</h2>
            <p className="text-xs text-slate-500">Autonomous software development assistant</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center space-x-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 animate-bounce" />
            <span>{error}</span>
          </div>
        )}

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
                className="w-full bg-slate-955 bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none transition-colors"
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
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-955 bg-slate-955 bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-650 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? 'Authenticating Session...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-850">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-350 font-bold hover:underline transition-colors">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
};
