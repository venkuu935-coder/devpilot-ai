import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Check, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'info' | 'error';
  date: string;
  read: boolean;
}

const defaultNotifications: Notification[] = [
  {
    id: '1',
    title: 'Scan Finished Successfully',
    description: 'Project E-commerce API analysis and review checks completed.',
    type: 'success',
    date: '5m ago',
    read: false
  },
  {
    id: '2',
    title: 'AI Tasks Completed',
    description: 'Generated Jest test suite templates for Mobile App.',
    type: 'info',
    date: '20m ago',
    read: false
  },
  {
    id: '3',
    title: 'Upload Finished',
    description: 'Repository codebase project zip uploaded successfully.',
    type: 'success',
    date: '1h ago',
    read: true
  },
  {
    id: '4',
    title: 'Security Vulnerability Detected',
    description: 'SQL Injection vulnerabilities mapped in authentication routes.',
    type: 'error',
    date: '3h ago',
    read: false
  }
];

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('app_notifications');
    return saved ? JSON.parse(saved) : defaultNotifications;
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for dynamic app notifications
  useEffect(() => {
    const handleNewAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const newNotif: Notification = {
          id: Date.now().toString(),
          title: customEvent.detail.title,
          description: customEvent.detail.description,
          type: customEvent.detail.type || 'info',
          date: 'Just now',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    };
    window.addEventListener('app-notification', handleNewAlert);
    return () => window.removeEventListener('app-notification', handleNewAlert);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-450 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-455 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-20 bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-8 fixed right-0 left-64 top-0 z-40"
    >
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-3 h-4.5 w-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search projects, AI actions, or settings..."
            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-12 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/80 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6 relative">
        {/* Bell Button trigger */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2.5 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all shadow-inner"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4.5 min-w-4.5 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* History Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-80 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 text-slate-200"
              >
                {/* Header controls */}
                <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/15">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleMarkAllRead}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-350 rounded-lg transition-all"
                        title="Mark all as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleClearAll}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-350 rounded-lg transition-all"
                        title="Clear history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-semibold leading-relaxed">
                      No notifications available.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleRead(item.id)}
                        className={`p-3.5 flex gap-3 transition-colors cursor-pointer ${
                          item.read ? 'opacity-60 bg-transparent hover:bg-slate-900/30' : 'bg-indigo-500/5 hover:bg-indigo-500/10'
                        }`}
                      >
                        {getNotifIcon(item.type)}
                        <div className="flex-1 space-y-0.5">
                          <h4 className="text-[11px] font-bold text-slate-200 leading-tight">{item.title}</h4>
                          <p className="text-[9.5px] text-slate-400 leading-relaxed font-semibold">{item.description}</p>
                          <span className="text-[8px] text-slate-550 font-mono font-bold block pt-1">{item.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User profile dropdown snippet */}
        <div className="flex items-center space-x-3 pl-6 border-l border-white/10 cursor-pointer group">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{user?.username || 'Developer'}</span>
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">{user?.role || 'Guest'}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/20 ring-2 ring-white/10 group-hover:ring-indigo-400 transition-all">
            {user?.username?.slice(0, 2).toUpperCase() || 'DP'}
          </div>
        </div>
      </div>
    </motion.header>
  );
};
