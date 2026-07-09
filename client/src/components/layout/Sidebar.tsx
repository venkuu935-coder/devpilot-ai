import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, LayoutDashboard, Settings, User, Code2, Zap, FileText, ShieldAlert, Shield, FileCode, GitBranch, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: Code2 },
    { name: 'AI Services', path: '/ai-services', icon: Zap },
    { name: 'Documentation', path: '/documentation', icon: FileText },
    { name: 'Code Review', path: '/code-review', icon: ShieldAlert },
    { name: 'Security Scan', path: '/security', icon: Shield },
    { name: 'Test Generator', path: '/tests', icon: FileCode },
    { name: 'System Diagrams', path: '/diagrams', icon: GitBranch },
    { name: 'Admin Panel', path: '/admin', icon: ShieldCheck },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <motion.aside
      initial={{ x: -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50 shadow-2xl"
    >
      <div className="p-6 border-b border-white/5 flex items-center space-x-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
          <Compass className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
          DevPilot AI
        </span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 mt-4">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:shadow-md border border-transparent'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Upgrade Call to action */}
      <div className="p-4 mb-4">
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full filter blur-2xl group-hover:bg-indigo-400/30 transition-colors duration-500"></div>
          <div className="relative z-10">
            <h4 className="text-white text-sm font-bold mb-1">DevPilot Pro</h4>
            <p className="text-[11px] text-indigo-200/70 mb-4 leading-relaxed font-medium">Unlock advanced AI analysis and team collaboration.</p>
            <button className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
