import React, { useState } from 'react';
import {
  User,
  Lock,
  Palette,
  Bell,
  Key,
  Sliders,
  AlertTriangle,
  Check,
  Trash2,
  LogOut,
  Save,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

type TabType = 'profile' | 'password' | 'theme' | 'notifications' | 'apikeys' | 'preferences' | 'danger';

export const Settings: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Form states
  const [profileName, setProfileName] = useState('John Doe');
  const [profileEmail, setProfileEmail] = useState('john.doe@example.com');
  const [profileBio, setProfileBio] = useState('Full Stack Software Engineer & Systems Architect');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('settings_theme') || 'dark');

  const [notifyScan, setNotifyScan] = useState(true);
  const [notifySmell, setNotifySmell] = useState(true);
  const [notifySec, setNotifySec] = useState(true);

  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [githubKey, setGithubKey] = useState(() => localStorage.getItem('GITHUB_TOKEN') || '');

  const [defaultLang, setDefaultLang] = useState('typescript');
  const [autoScan, setAutoScan] = useState(true);
  const [defaultFormat, setDefaultFormat] = useState('pdf');

  // Save feedback states
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const triggerSaveNotification = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }, 600);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSaveNotification();
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    triggerSaveNotification();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveTheme = (theme: string) => {
    setActiveTheme(theme);
    localStorage.setItem('settings_theme', theme);
    document.documentElement.classList.remove('light-theme-mock', 'cyberpunk-theme-mock');
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme-mock');
    } else if (theme === 'cyberpunk') {
      document.documentElement.classList.add('cyberpunk-theme-mock');
    }
    triggerSaveNotification();
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('GITHUB_TOKEN', githubKey);
    triggerSaveNotification();
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all repository diagnostic cache files? This cannot be undone.')) {
      triggerSaveNotification();
    }
  };

  const menuItems = [
    { type: 'profile', name: 'Profile Settings', icon: User },
    { type: 'password', name: 'Security & Password', icon: Lock },
    { type: 'theme', name: 'Appearance & Theme', icon: Palette },
    { type: 'notifications', name: 'Notifications Alert', icon: Bell },
    { type: 'apikeys', name: 'API Key Integrations', icon: Key },
    { type: 'preferences', name: 'Workspace Preferences', icon: Sliders },
    { type: 'danger', name: 'Danger Zone', icon: AlertTriangle, color: 'text-rose-400' }
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Configuration</h1>
        <p className="text-sm text-slate-400 font-medium">Control profile details, API integrations, theme toggles, and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left tabs menu */}
        <div className="md:col-span-1 p-2 bg-slate-900/40 border border-white/5 rounded-3xl space-y-1">
          {menuItems.map((item) => {
            const isSel = activeTab === item.type;
            return (
              <button
                key={item.type}
                onClick={() => {
                  setActiveTab(item.type as TabType);
                  setPasswordError(null);
                }}
                className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-left transition-all text-xs font-bold ${
                  isSel
                    ? 'bg-indigo-650/15 text-indigo-300 shadow-sm border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${item.color || 'text-indigo-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right workspace panel */}
        <div className="md:col-span-3 p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl relative min-h-[400px]">
          {/* Saved feedback message */}
          {savedSuccess && (
            <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md animate-pulse">
              <Check className="h-4 w-4" />
              <span>Configurations Saved!</span>
            </div>
          )}

          {saving && (
            <div className="absolute top-4 right-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating registry...</span>
            </div>
          )}

          {/* Tab 1: Profile Settings */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Profile Information</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bio</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Save Profile Settings</span>
              </button>
            </form>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Access Security</h3>

              {passwordError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-xl font-semibold">
                  {passwordError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Save Password</span>
              </button>
            </form>
          )}

          {/* Tab 3: Appearance & Theme */}
          {activeTab === 'theme' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Appearance</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Theme choice: Dark */}
                <div
                  onClick={() => handleSaveTheme('dark')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    activeTheme === 'dark'
                      ? 'bg-indigo-650/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Dark Slate</h4>
                  <p className="text-[9px] text-slate-550 leading-relaxed font-semibold">Default obsidian framework backdrop with indigo accent highlights.</p>
                </div>

                {/* Theme choice: Light */}
                <div
                  onClick={() => handleSaveTheme('light')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    activeTheme === 'light'
                      ? 'bg-indigo-650/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Light Contrast</h4>
                  <p className="text-[9px] text-slate-550 leading-relaxed font-semibold">Clean, white paper interface offering high element clarity.</p>
                </div>

                {/* Theme choice: Cyberpunk */}
                <div
                  onClick={() => handleSaveTheme('cyberpunk')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    activeTheme === 'cyberpunk'
                      ? 'bg-indigo-650/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Cyber Synth</h4>
                  <p className="text-[9px] text-slate-550 leading-relaxed font-semibold">Neon-lit console frame showcasing vivid pink and cyan gradients.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Alert Config</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Scan Completion Alert</h4>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Send a system check alert when a repository ZIP finishes scanning.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyScan}
                    onChange={(e) => {
                      setNotifyScan(e.target.checked);
                      triggerSaveNotification();
                    }}
                    className="h-4.5 w-4.5 rounded border-white/15 bg-slate-950 text-indigo-600 focus:ring-indigo-550/30"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Code Smell Reminders</h4>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Notify when large functions or naming problems are identified.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySmell}
                    onChange={(e) => {
                      setNotifySmell(e.target.checked);
                      triggerSaveNotification();
                    }}
                    className="h-4.5 w-4.5 rounded border-white/15 bg-slate-950 text-indigo-600 focus:ring-indigo-550/30"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Vulnerability Scans Warning</h4>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Alert immediately if SQL injection or hardcoded access tokens are found.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySec}
                    onChange={(e) => {
                      setNotifySec(e.target.checked);
                      triggerSaveNotification();
                    }}
                    className="h-4.5 w-4.5 rounded border-white/15 bg-slate-950 text-indigo-600 focus:ring-indigo-550/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: API Keys */}
          {activeTab === 'apikeys' && (
            <form onSubmit={handleSaveKeys} className="space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Access Token Credentials</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  placeholder="Enter Gemini API key"
                />
                <p className="text-[9px] text-slate-500 font-medium">Used for parsing repository files and streaming AI chat responses.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={githubKey}
                  onChange={(e) => setGithubKey(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                  placeholder="Enter GITHUB_TOKEN"
                />
                <p className="text-[9px] text-slate-500 font-medium">Used for cloning code repositories directly from GitHub URLs.</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>Save API Credentials</span>
              </button>
            </form>
          )}

          {/* Tab 6: Workspace Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Global Workspace Settings</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Default Language Option</label>
                <select
                  value={defaultLang}
                  onChange={(e) => {
                    setDefaultLang(e.target.value);
                    triggerSaveNotification();
                  }}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="java">Java</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Reports Format</label>
                <select
                  value={defaultFormat}
                  onChange={(e) => {
                    setDefaultFormat(e.target.value);
                    triggerSaveNotification();
                  }}
                  className="w-full bg-slate-950 border border-white/5 text-slate-250 text-xs rounded-xl px-3.5 py-3 outline-none focus:border-indigo-500/50 shadow-inner"
                >
                  <option value="pdf">Styled PDF report</option>
                  <option value="markdown">Markdown summary (.md)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Auto Scan Repository</h4>
                  <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Automatically trigger code review scans upon ZIP archive upload finishes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => {
                    setAutoScan(e.target.checked);
                    triggerSaveNotification();
                  }}
                  className="h-4.5 w-4.5 rounded border-white/15 bg-slate-950 text-indigo-600 focus:ring-indigo-550/30"
                />
              </div>
            </div>
          )}

          {/* Tab 7: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-5 border border-rose-500/25 p-5 rounded-2xl bg-rose-500/5">
              <h3 className="text-xs font-bold text-rose-455 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Critical Safeguard Actions
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                Warning: These options are destructive. Make sure you understand the consequences before running them.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5 gap-3 sm:gap-0">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Reset Local Diagnostics Cache</h4>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Flush scanned summaries, security diagnostics list, and documentation caches.</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/35 hover:border-rose-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 self-start sm:self-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Cache</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/40 rounded-2xl border border-white/5 gap-3 sm:gap-0">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Deactivate Session Account</h4>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Log out from the dashboard console workspace immediately.</p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 self-start sm:self-auto"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
