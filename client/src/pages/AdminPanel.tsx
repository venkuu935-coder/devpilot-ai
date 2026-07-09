import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Users,
  Database,
  Terminal,
  Activity,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { useAuth } from '../context/AuthContext.tsx';

type AdminTab = 'users' | 'projects' | 'logs' | 'resources';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'developer' | 'guest';
  status: 'active' | 'suspended';
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}

interface ProjectRecord {
  id: string;
  name: string;
  fileCount: number;
  sizeMB: number;
  createdAt: string;
}

export const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Users state
  const [usersList, setUsersList] = useState<UserRecord[]>([
    {
      id: 'usr-1',
      username: 'john_doe',
      email: 'john.doe@example.com',
      role: 'admin',
      status: 'active',
      permissions: { read: true, write: true, execute: true }
    },
    {
      id: 'usr-2',
      username: 'jane_smith',
      email: 'jane.smith@example.com',
      role: 'developer',
      status: 'active',
      permissions: { read: true, write: true, execute: false }
    },
    {
      id: 'usr-3',
      username: 'bob_johnson',
      email: 'bob.johnson@example.com',
      role: 'guest',
      status: 'active',
      permissions: { read: true, write: false, execute: false }
    }
  ]);

  // Projects list
  const [projectsList, setProjectsList] = useState<ProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Live log lines
  const [logsFeed, setLogsFeed] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // CPU/Memory metrics history
  const [metricsHistory, setMetricsHistory] = useState<Array<{ name: string; cpu: number; memory: number }>>([
    { name: '10:00', cpu: 12, memory: 40 },
    { name: '10:05', cpu: 18, memory: 41 },
    { name: '10:10', cpu: 15, memory: 42 },
    { name: '10:15', cpu: 22, memory: 42 },
    { name: '10:20', cpu: 38, memory: 44 },
    { name: '10:25', cpu: 45, memory: 45 },
    { name: '10:30', cpu: 20, memory: 43 }
  ]);

  const API_URL = 'http://localhost:5000/api';

  // Fetch real uploaded projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
          const mapped: ProjectRecord[] = json.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            fileCount: p.fileCount || 10,
            sizeMB: parseFloat((Math.random() * 3 + 0.8).toFixed(2)), // simulate storage size
            createdAt: new Date(p.createdAt).toLocaleDateString()
          }));
          setProjectsList(mapped);
        }
      } catch (err) {
        console.error('Failed to load projects list', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    if (token) {
      fetchProjects();
    }
  }, [token]);

  // Handle deleting project directly
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this project? This frees server storage.')) return;
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjectsList(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Modify user roles
  const handleRoleChange = (userId: string, newRole: 'admin' | 'developer' | 'guest') => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  // Toggle user permissions
  const handlePermissionToggle = (userId: string, key: 'read' | 'write' | 'execute') => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [key]: !u.permissions[key]
          }
        };
      }
      return u;
    }));
  };

  // Live scroll mock logger
  useEffect(() => {
    const defaultLogs = [
      '[SYSTEM]: Daemon process initiated. Monitoring socket connections.',
      '[DATABASE]: Postgres connection successfully established via Prisma.',
      '[FASTAPI]: Static scanner mounted on port 8000 successfully.',
      '[SERVER]: Express routing pipeline active.',
      '[SECURITY]: Loaded CORS policies and middleware filters.'
    ];
    setLogsFeed(defaultLogs);

    const interval = setInterval(() => {
      const actions = [
        `[USER]: Token validation requested by session.`,
        `[SCANNER]: Triggered codebase reviews check on project index.`,
        `[SYSTEM]: Server health checking: CPU load at 21%, Memory usage stable.`,
        `[FASTAPI]: Streamed response buffer successfully flushed.`,
        `[DATABASE]: Project analytics logs written to database.`
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const timestamp = new Date().toLocaleTimeString();
      setLogsFeed(prev => [...prev.slice(-30), `[${timestamp}] ${randomAction}`]);
      
      // Update charts resources line dynamically
      setMetricsHistory(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const lastMem = prev[prev.length - 1].memory;
        const newCpu = Math.floor(Math.random() * 40 + 10);
        const newMem = Math.max(20, Math.min(90, lastMem + Math.floor(Math.random() * 5 - 2)));
        return [...prev.slice(-6), { name: nextTime, cpu: newCpu, memory: newMem }];
      });

    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (activeTab === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsFeed, activeTab]);

  const totalStorageUsed = projectsList.reduce((acc, curr) => acc + curr.sizeMB, 0).toFixed(2);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
          Admin Management Panel
        </h1>
        <p className="text-sm text-slate-400 font-medium">Verify system storage boundaries, customize developer permissions, and trace logs.</p>
      </div>

      {/* Tabs Menu Header */}
      <div className="flex space-x-2 p-1.5 bg-slate-900/40 border border-white/5 rounded-2xl w-max">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-indigo-650/15 border border-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Manage Users</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'projects'
              ? 'bg-indigo-650/15 border border-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Storage & Projects</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'bg-indigo-650/15 border border-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Live Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'resources'
              ? 'bg-indigo-650/15 border border-indigo-500/20 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>System Resources</span>
        </button>
      </div>

      {/* Workspace Display Area */}
      <div className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl min-h-[420px]">
        
        {/* Tab 1: Manage Users */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Access Roles & Permissions</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Customize user credentials and control action authorizations.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500 font-bold">
                    <th className="pb-3">Username</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Assigned Role</th>
                    <th className="pb-3 text-center">Permissions (R / W / X)</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {usersList.map((usr) => (
                    <tr key={usr.id} className="text-slate-300">
                      <td className="py-4 font-bold text-white">{usr.username}</td>
                      <td className="py-4 text-slate-400">{usr.email}</td>
                      <td className="py-4">
                        <select
                          value={usr.role}
                          onChange={(e) => handleRoleChange(usr.id, e.target.value as any)}
                          className="bg-slate-950 border border-white/5 rounded-lg px-2 py-1 outline-none text-slate-350 focus:border-indigo-500/50"
                        >
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                          <option value="guest">Guest</option>
                        </select>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-center items-center space-x-4">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usr.permissions.read}
                              onChange={() => handlePermissionToggle(usr.id, 'read')}
                              className="h-3.5 w-3.5 bg-slate-950 border-white/5 rounded text-indigo-500 focus:ring-0"
                            />
                            <span className="text-[9px] font-bold text-slate-500">Read</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usr.permissions.write}
                              onChange={() => handlePermissionToggle(usr.id, 'write')}
                              className="h-3.5 w-3.5 bg-slate-950 border-white/5 rounded text-indigo-500 focus:ring-0"
                            />
                            <span className="text-[9px] font-bold text-slate-500">Write</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usr.permissions.execute}
                              onChange={() => handlePermissionToggle(usr.id, 'execute')}
                              className="h-3.5 w-3.5 bg-slate-950 border-white/5 rounded text-indigo-500 focus:ring-0"
                            />
                            <span className="text-[9px] font-bold text-slate-500">Execute</span>
                          </label>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/15 uppercase">
                          {usr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Projects & Storage */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Storage Capacity</h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Control repository indexes and clean old files cache.</p>
              </div>

              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center space-x-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Used</span>
                  <span className="text-sm font-extrabold text-indigo-400">{totalStorageUsed} MB / 100 MB</span>
                </div>
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${Math.min(100, (parseFloat(totalStorageUsed) / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {loadingProjects ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              </div>
            ) : projectsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-semibold leading-relaxed">
                No active project workspaces mapped in local server storage database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500 font-bold">
                      <th className="pb-3">Project Workspace</th>
                      <th className="pb-3">Uploaded Date</th>
                      <th className="pb-3 text-center">Diagnostics Files</th>
                      <th className="pb-3 text-center">Disk Quota</th>
                      <th className="pb-3 text-right">Delete Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {projectsList.map((proj) => (
                      <tr key={proj.id} className="text-slate-300">
                        <td className="py-4 font-bold text-white flex items-center gap-2">
                          <Database className="h-4 w-4 text-indigo-500 shrink-0" />
                          {proj.name}
                        </td>
                        <td className="py-4 text-slate-400">{proj.createdAt}</td>
                        <td className="py-4 text-center font-mono font-bold text-slate-350">{proj.fileCount} code files</td>
                        <td className="py-4 text-center font-mono font-bold text-indigo-300">{proj.sizeMB} MB</td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-500/25"
                            title="Delete Workspace Index"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: System Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live System Logs Terminal</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Real-time diagnosis logger showing socket events, database queries, and static scanning triggers.</p>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 h-80 overflow-y-auto font-mono text-[10px] text-slate-300 leading-relaxed space-y-1.5 custom-scrollbar">
              {logsFeed.map((line, index) => {
                const isSystem = line.includes('[SYSTEM]');
                const isSec = line.includes('[SECURITY]');
                const color = isSystem ? 'text-indigo-400' : isSec ? 'text-rose-400' : 'text-slate-300';
                return (
                  <div key={index} className={color}>
                    {line}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Tab 4: System Resources */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Performance Resource Analytics</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Live graphs monitoring server daemon activities, memory outputs, and core processing limits.</p>
            </div>

            {/* Resources charts display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CPU Processing Load (%)</span>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metricsHistory}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.05)' }} />
                      <Area type="monotone" dataKey="cpu" name="CPU Load" stroke="#818cf8" strokeWidth={2} fill="url(#colorCpu)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Memory Usage (%)</span>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metricsHistory}>
                      <defs>
                        <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.05)' }} />
                      <Area type="monotone" dataKey="memory" name="Memory Load" stroke="#f472b6" strokeWidth={2} fill="url(#colorMem)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
