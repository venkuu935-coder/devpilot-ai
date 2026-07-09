import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Clock,
  Plus,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Folder,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  Download,
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from '../components/ui/button.tsx';

interface Project {
  id: string;
  name: string;
}

interface AnalyticsData {
  health_score: number;
  security_score: number;
  maintainability_score: number;
  complexity_score: number;
  documentation_score: number;
  history: Array<{ date: string; health: number; security: number; maintainability: number }>;
  breakdown: Array<{ name: string; issues: number }>;
  recent_reports: Array<{ name: string; status: string; issues?: number }>;
}

export const Dashboard: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Projects loading
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // Analytics metrics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://localhost:5000/api';
  const FASTAPI_URL = 'http://localhost:8000/api';

  // Fetch projects list from Express server
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setProjects(json.data);
          if (json.data.length > 0) {
            setSelectedProjectId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      } finally {
        setProjectsLoading(false);
      }
    };
    if (token) {
      fetchProjects();
    }
  }, [token]);

  // Fetch analytics from FastAPI server
  const fetchAnalytics = async (projectId: string) => {
    if (!projectId) return;
    setAnalyticsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${FASTAPI_URL}/analytics/${projectId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAnalytics(json);
      } else {
        throw new Error(json.detail || 'Failed to fetch analytics metrics.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Vulnerability scan engine connection failed. Ensure the FastAPI backend is running on port 8000. details: ${err.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchAnalytics(selectedProjectId);
    }
  }, [selectedProjectId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-450';
    return 'text-rose-455';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const getSelectedProjectName = () => {
    const proj = projects.find(p => p.id === selectedProjectId);
    return proj ? proj.name : '';
  };

  const handleExportMDReport = () => {
    if (!analytics) return;
    const projName = getSelectedProjectName() || selectedProjectId;
    let md = `# Codebase Audit & Security Report - ${projName}\n\n`;
    md += `**Date**: ${new Date().toLocaleDateString()}\n`;
    md += `**Overall Health Score**: ${analytics.health_score}%\n\n`;
    
    md += `## 1. Executive Summary\n`;
    md += `- **Security Rating**: ${analytics.security_score}%\n`;
    md += `- **Maintainability Rating**: ${analytics.maintainability_score}%\n`;
    md += `- **Complexity Health**: ${analytics.complexity_score}%\n`;
    md += `- **Documentation Coverage**: ${analytics.documentation_score}%\n\n`;
    
    md += `## 2. Issues Breakdown by Categories\n`;
    analytics.breakdown.forEach(item => {
      md += `- **${item.name}**: ${item.issues} detected issues\n`;
    });
    md += `\n`;
    
    md += `## 3. System Reports Mapped\n`;
    analytics.recent_reports.forEach(rep => {
      md += `- **${rep.name}**: ${rep.status} ${rep.issues !== undefined ? `(${rep.issues} items)` : ''}\n`;
    });
    md += `\n`;
    
    md += `## 4. Secure Coding Recommendations\n`;
    md += `- **SQL Injection Mitigation**: Use parameterized queries / prepared statements (e.g. \`db.query("SELECT ... WHERE id = ?", [id])\`).\n`;
    md += `- **XSS Mitigation**: Sanitize inputs using DOMPurify before setting raw HTML in innerHTML / dangerouslySetInnerHTML.\n`;
    md += `- **Validation Schema Check**: Use validation libraries (e.g., Zod, Yup) to enforce types on REST API input payloads.\n`;
    md += `- **Hardcoded Secrets**: Move access keys, passwords, and private tokens to system environment files (.env).\n`;
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projName.replace(/\s+/g, '_')}_audit_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDFReport = () => {
    if (!analytics) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;
    
    const projName = getSelectedProjectName() || selectedProjectId;
    const title = `${projName} - AUDIT REPORT`;
    
    const breakdownRows = analytics.breakdown.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; font-size: 13px;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px;">${item.issues}</td>
      </tr>
    `).join('');

    const reportRows = analytics.recent_reports.map(rep => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${rep.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">${rep.status}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right;">${rep.issues !== undefined ? rep.issues : 'N/A'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              line-height: 1.6;
              padding: 40px;
            }
            .header {
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              color: #020617;
              margin: 0;
              font-weight: bold;
            }
            .meta {
              font-size: 12px;
              color: #64748b;
              margin-top: 5px;
            }
            .section-title {
              font-size: 16px;
              color: #1e293b;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .metric-label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: bold;
              display: block;
              margin-bottom: 5px;
            }
            .metric-value {
              font-size: 20px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #f8fafc;
              border-bottom: 1.5px solid #e2e8f0;
              padding: 10px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              color: #64748b;
              text-align: left;
            }
            ul {
              font-size: 13px;
              padding-left: 20px;
            }
            li {
              margin-bottom: 8px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Codebase Audit & Security Report</div>
            <div class="meta">Project Workspace: ${projName} | Compiled Date: ${new Date().toLocaleDateString()}</div>
          </div>
          
          <div class="section-title">Executive Summary</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">Health Score</span>
              <span class="metric-value">${analytics.health_score}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Security</span>
              <span class="metric-value">${analytics.security_score}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Maintainability</span>
              <span class="metric-value">${analytics.maintainability_score}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Complexity</span>
              <span class="metric-value">${analytics.complexity_score}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Documentation</span>
              <span class="metric-value">${analytics.documentation_score}%</span>
            </div>
          </div>
          
          <div class="section-title">Code Smells & Vulnerability Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: right;">Detected Issues</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows}
            </tbody>
          </table>
          
          <div class="section-title">Scan Reports Logs</div>
          <table>
            <thead>
              <tr>
                <th>Report Module</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: right;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${reportRows}
            </tbody>
          </table>
          
          <div class="section-title">Refactoring Recommendations</div>
          <ul>
            <li><strong>SQL Injection Protection</strong>: Enforce parameters/prepared placeholders on SQL query routines to restrict script command injections.</li>
            <li><strong>XSS Mitigation</strong>: Sanitize innerHTML variables utilizing tools like DOMPurify prior to browser injection.</li>
            <li><strong>Payload Schema Validation</strong>: Establish strict request parameter validations (Zod validators) to ensure request shapes are uniform.</li>
            <li><strong>Hardcoded Secrets</strong>: Migrate hardcoded API hashes, keys, and DB passwords to system environment variables (.env).</li>
          </ul>
        </body>
      </html>
    `;
    
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-400" />
            Codebase Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-400 font-medium">Verify system health metrics, dependency updates, and automated security reports.</p>
        </div>

        {/* Controllers */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {projectsLoading ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg ring-1 ring-white/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 w-full">
              {analytics && (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleExportMDReport}
                    className="p-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl transition-all shadow-inner flex items-center gap-1 text-xs font-semibold"
                    title="Download Markdown Audit"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden md:inline">MD</span>
                  </button>
                  <button
                    onClick={handleExportPDFReport}
                    className="p-2.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl transition-all shadow-inner flex items-center gap-1 text-xs font-semibold"
                    title="Download PDF Report"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden md:inline">PDF</span>
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold shrink-0">
                <Folder className="h-4 w-4" />
                <span>Scope:</span>
              </div>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500/50 min-w-44"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-455 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block">Diagnostics Error</span>
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {analyticsLoading && (
        <div className="p-12 bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Loading Analytics</h4>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Running parser matrices and checks...</p>
          </div>
        </div>
      )}

      {!analyticsLoading && analytics && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-5 rounded-2xl border transition-colors relative overflow-hidden ${getScoreBg(analytics.health_score)}`}>
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block mb-1">Health Score</span>
              <span className={`text-3xl font-extrabold ${getScoreColor(analytics.health_score)}`}>{analytics.health_score}%</span>
            </div>
            <div className={`p-5 rounded-2xl border transition-colors relative overflow-hidden ${getScoreBg(analytics.security_score)}`}>
              <span className="text-[10px] text-slate-555 font-bold uppercase tracking-wider block mb-1">Security</span>
              <span className={`text-3xl font-extrabold ${getScoreColor(analytics.security_score)}`}>{analytics.security_score}%</span>
            </div>
            <div className={`p-5 rounded-2xl border transition-colors relative overflow-hidden ${getScoreBg(analytics.maintainability_score)}`}>
              <span className="text-[10px] text-slate-560 font-bold uppercase tracking-wider block mb-1">Maintainability</span>
              <span className={`text-3xl font-extrabold ${getScoreColor(analytics.maintainability_score)}`}>{analytics.maintainability_score}%</span>
            </div>
            <div className={`p-5 rounded-2xl border transition-colors relative overflow-hidden ${getScoreBg(analytics.complexity_score)}`}>
              <span className="text-[10px] text-slate-565 font-bold uppercase tracking-wider block mb-1">Complexity</span>
              <span className={`text-3xl font-extrabold ${getScoreColor(analytics.complexity_score)}`}>{analytics.complexity_score}%</span>
            </div>
            <div className={`p-5 rounded-2xl border transition-colors relative overflow-hidden ${getScoreBg(analytics.documentation_score)}`}>
              <span className="text-[10px] text-slate-570 font-bold uppercase tracking-wider block mb-1">Documentation</span>
              <span className={`text-3xl font-extrabold ${getScoreColor(analytics.documentation_score)}`}>{analytics.documentation_score}%</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* History trend Line Chart */}
            <div className="lg:col-span-2 p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Health Trend History</h3>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Overall code health ratings across the last five repository updates.</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.history}>
                    <defs>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                      itemStyle={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="health" name="Health Rating" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown bar chart */}
            <div className="lg:col-span-1 p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Smells & Issues</h3>
                <p className="text-[11px] text-slate-405 font-medium leading-relaxed">Distribution of code smells and vulnerabilities by categories.</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                      itemStyle={{ color: '#ec4899', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="issues" name="Issue Count" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Details Row: Recent scans & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Reports status table */}
            <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generated Scans & Reports</h3>
              <div className="space-y-3.5">
                {analytics.recent_reports.map((rep, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{rep.name}</h4>
                      {rep.issues !== undefined && (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Found: {rep.issues} items</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {rep.status === 'Completed' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>
                        </>
                      ) : (
                        <>
                          <CircleDashed className="h-4 w-4 text-amber-400 animate-spin" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historical Scan Timeline */}
            <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl shadow-xl space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scanning Audit History</h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:h-full before:w-[2px] before:bg-slate-800">
                {analytics.history.slice().reverse().map((item, idx) => (
                  <div key={idx} className="relative pl-8 flex items-center justify-between group">
                    <div className="absolute left-1.5 h-5 w-5 rounded-full border-2 border-slate-700 bg-slate-950 group-hover:border-indigo-500 transition-colors z-10 flex items-center justify-center">
                      <Clock className="h-2.5 w-2.5 text-slate-500 group-hover:text-indigo-400" />
                    </div>

                    <div className="flex-1 flex justify-between items-center p-3 bg-slate-950/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                      <div>
                        <h4 className="text-xs font-bold text-slate-300">Run Automated codebase audit</h4>
                        <span className="text-[9px] text-indigo-400/80 font-bold block mt-0.5 font-mono">{item.date}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${getScoreColor(item.health)}`}>{item.health}%</span>
                        <span className="text-[9px] text-slate-500 font-bold block mt-0.5 uppercase">Health</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!projectsLoading && projects.length === 0 && (
        <div className="p-12 bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
          <div className="bg-indigo-500/10 p-5 rounded-2xl text-indigo-400 border border-indigo-500/15">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Projects Uploaded</h3>
            <p className="text-[11px] text-slate-455 leading-relaxed mt-1.5 font-semibold">
              Go to the Projects page to upload a zip archive or connect a public GitHub repository URL. Once uploaded, the Analytics dashboard will draw statistics automatically.
            </p>
          </div>
          <Button
            onClick={() => navigate('/projects')}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-650 hover:bg-indigo-655 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            <span>Upload codebase</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
