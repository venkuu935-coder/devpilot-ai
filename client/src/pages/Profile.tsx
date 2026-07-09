import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';
import { Mail, Shield, Calendar, LogOut } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, token, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-extrabold text-white">User Profile</h2>
        <p className="text-xs text-slate-500">Review your developer credential details and active session tokens.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>

        {/* Profile Card Header */}
        <div className="flex items-center space-x-5 border-b border-slate-800/80 pb-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-indigo-600/10 shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user.username}</h3>
            <span className="text-[10px] font-mono tracking-widest uppercase font-semibold px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-400 mt-1 inline-block">
              {user.role}
            </span>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <div className="flex items-center space-x-3 text-slate-400">
              <Mail className="h-4.5 w-4.5 text-slate-500" />
              <span>Email Address</span>
            </div>
            <span className="text-slate-200 font-medium">{user.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <div className="flex items-center space-x-3 text-slate-400">
              <Shield className="h-4.5 w-4.5 text-slate-500" />
              <span>Access Role</span>
            </div>
            <span className="text-slate-250 font-bold uppercase">{user.role}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-850">
            <div className="flex items-center space-x-3 text-slate-400">
              <Calendar className="h-4.5 w-4.5 text-slate-500" />
              <span>Account Created</span>
            </div>
            <span className="text-slate-200">
              {new Date(user.createdAt).toLocaleDateString([], { dateStyle: 'long' })}
            </span>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <span className="text-slate-500 font-mono text-[10px] uppercase">Active JWT Access Token</span>
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl font-mono text-[9px] text-slate-500 break-all select-all leading-normal">
              {token}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-slate-850">
          <Button variant="danger" size="sm" onClick={logout} className="flex items-center space-x-2">
            <LogOut className="h-4 w-4" />
            <span>Sign Out Session</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
