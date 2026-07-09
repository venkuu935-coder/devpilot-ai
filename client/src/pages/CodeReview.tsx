import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Loader2,
  Download,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
  FileCode,
  ArrowRight,
  Search
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Project {
  id: string;
  name: string;
}

interface Finding {
  file: string;
  line: number;
  issue_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  snippet: string;
  suggestion: string;
}

export const CodeReview: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Scans and findings states
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState<string>('');
  
  // Selected finding details
  const [selectedFindingIdx, setSelectedFindingIdx] = useState<number | null>(null);
  
  // Filtering and search
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const API_URL = 'http://localhost:5000/api';
  const FASTAPI_URL = 'http://localhost:8000/api';

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

  const handleStartReview = async () => {
    if (!selectedProjectId || loading) return;
    setLoading(true);
    setFindings([]);
    setSelectedFindingIdx(null);
    
    // Simulate compilation steps for visual wow factor
    const steps = [
      'Initializing static analyzer hooks...',
      'Mapping file directory hierarchies...',
      'Analyzing variables scope and refs...',
      'Verifying programming naming schemas...',
      'Detecting duplicate codebase lines...',
      'Flagging synchronous controller blockers...',
      'Compiling audit report findings...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setScanProgress(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      const res = await fetch(`${FASTAPI_URL}/review/${selectedProjectId}`, {
        method: 'POST'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFindings(json.findings);
        if (json.findings.length > 0) {
          setSelectedFindingIdx(0);
        }
      } else {
        throw new Error(json.detail || 'Audit execution failed.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Code Review failed: Make sure the FastAPI server is running on port 8000. details: ${err.message}`);
    } finally {
      setLoading(false);
      setScanProgress('');
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'high':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
      default:
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" />;
      case 'high':
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'low':
      default:
        return <Info className="h-4 w-4 text-sky-400 shrink-0" />;
    }
  };

  const handleExportJSON = () => {
    if (findings.length === 0) return;
    const blob = new Blob([JSON.stringify(findings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_review_${selectedProjectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (findings.length === 0) return;
    
    const proj = projects.find(p => p.id === selectedProjectId);
    const projName = proj ? proj.name : selectedProjectId;
    
    let md = `# Code Review Audit Report - Project ${projName}\n\n`;
    md += `**Total issues found**: ${findings.length}\n\n`;
    
    const critical = findings.filter(f => f.severity === 'Critical').length;
    const high = findings.filter(f => f.severity === 'High').length;
    const medium = findings.filter(f => f.severity === 'Medium').length;
    const low = findings.filter(f => f.severity === 'Low').length;
    
    md += `### Summary\n`;
    md += `- **Critical**: ${critical}\n`;
    md += `- **High**: ${high}\n`;
    md += `- **Medium**: ${medium}\n`;
    md += `- **Low**: ${low}\n\n`;
    
    md += `## Detailed Findings\n\n`;
    findings.forEach((f, index) => {
      md += `### [${index + 1}] ${f.issue_type} [Severity: ${f.severity}]\n`;
      md += `- **File**: \`${f.file}\` (Line ${f.line})\n`;
      md += `- **Description**: ${f.description}\n\n`;
      md += `#### Snippet:\n\`\`\`\n${f.snippet}\n\`\`\`\n\n`;
      md += `#### Suggestion:\n\`\`\`\n${f.suggestion}\n\`\`\`\n\n`;
      md += `---\n\n`;
    });
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_review_${selectedProjectId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = selectedSeverity === 'All' || f.severity === selectedSeverity;
    const matchesType = selectedType === 'All' || f.issue_type === selectedType;
    const matchesSearch = f.file.toLowerCase().includes(searchQuery.toLowerCase()) || f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesType && matchesSearch;
  });

  const getSelectedFinding = (): Finding | null => {
    if (selectedFindingIdx === null || filteredFindings.length <= selectedFindingIdx) return null;
    return filteredFindings[selectedFindingIdx];
  };

  const activeFinding = getSelectedFinding();

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-400" />
            Code Review Agent
          </h1>
          <p className="text-sm text-slate-400">Perform static codebase audits to map clean naming, variable usage, and performance leaks.</p>
        </div>

        {/* Action controllers */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {projectsLoading ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-slate-550 text-xs py-2 bg-slate-950/40 px-3 rounded-xl border border-white/5">
              Upload a project to run audits.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setFindings([]);
                  setSelectedFindingIdx(null);
                }}
                disabled={loading}
                className="bg-slate-900 border border-white/5 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500/50 min-w-44"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <Button
                onClick={handleStartReview}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Auditing codebase...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4.5 w-4.5" />
                    <span>Run Review Scan</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Progress View */}
      {loading && (
        <div className="p-8 bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Review Pipeline Active</h4>
            <p className="text-[11px] text-indigo-300/80 font-bold mt-1 font-mono">{scanProgress}</p>
          </div>
        </div>
      )}

      {!loading && findings.length > 0 && (
        <>
          {/* Audit Severity Counts Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Issues</span>
              <span className="text-2xl font-extrabold text-white">{findings.length}</span>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Critical</span>
              <span className="text-2xl font-extrabold text-rose-450">{findings.filter(f => f.severity === 'Critical').length}</span>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">High</span>
              <span className="text-2xl font-extrabold text-amber-500">{findings.filter(f => f.severity === 'High').length}</span>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-yellow-400"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Medium</span>
              <span className="text-2xl font-extrabold text-yellow-400">{findings.filter(f => f.severity === 'Medium').length}</span>
            </div>
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-sky-400"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Low</span>
              <span className="text-2xl font-extrabold text-sky-400">{findings.filter(f => f.severity === 'Low').length}</span>
            </div>
          </div>

          {/* Filtering and Workspace grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Findings list */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl space-y-3">
                {/* Search query */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedFindingIdx(0);
                    }}
                    placeholder="Search by file or issue..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 text-xs text-white rounded-xl pl-9 pr-4 py-2 outline-none"
                  />
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Severity</label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => {
                        setSelectedSeverity(e.target.value);
                        setSelectedFindingIdx(0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-[10px] rounded-lg p-1.5 outline-none font-semibold"
                    >
                      <option value="All">All Severities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setSelectedFindingIdx(0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-350 text-[10px] rounded-lg p-1.5 outline-none font-semibold"
                    >
                      <option value="All">All Issues</option>
                      <option value="Unused Variable">Unused Variables</option>
                      <option value="Large Function">Large Functions</option>
                      <option value="Naming Issue">Naming Issues</option>
                      <option value="Performance Problem">Performance</option>
                      <option value="Duplicate Code">Duplicate Code</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scrollable findings items */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/10 border border-white/5 rounded-2xl text-xs text-slate-500">
                    No findings matches your filter scopes.
                  </div>
                ) : (
                  filteredFindings.map((f, index) => {
                    const isSelected = selectedFindingIdx === index;
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedFindingIdx(index)}
                        className={`p-4.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                            : 'bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${getSeverityColor(f.severity)}`}>
                            {f.severity}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold font-mono truncate">{f.file.split('/').pop()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mt-2 truncate">{f.issue_type}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-semibold leading-relaxed">{f.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Finding details */}
            <div className="lg:col-span-2 p-6 bg-slate-900/40 border border-white/5 rounded-3xl min-h-[500px] flex flex-col justify-between">
              {activeFinding ? (
                <div className="space-y-6">
                  {/* Title & metadata */}
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center space-x-2.5">
                        {getSeverityIcon(activeFinding.severity)}
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{activeFinding.issue_type}</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                        <FileCode className="h-3 w-3 shrink-0" />
                        {activeFinding.file} : Line {activeFinding.line}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleExportMarkdown}
                        className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-450 hover:text-indigo-400 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                        title="Export Markdown Report"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">MD</span>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-450 hover:text-indigo-400 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                        title="Export JSON Report"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Finding Details</span>
                    <p className="text-xs text-slate-350 leading-relaxed font-semibold">{activeFinding.description}</p>
                  </div>

                  {/* Refactoring suggestions layout */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Code Suggestion Compare</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original Snippet */}
                      <div className="border border-rose-500/20 rounded-2xl bg-rose-950/10 overflow-hidden">
                        <div className="bg-rose-950/20 border-b border-rose-500/15 px-4 py-2 text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                          Trigger Line
                        </div>
                        <pre className="p-4 text-[11px] font-mono text-rose-300 leading-relaxed overflow-x-auto">
                          <code>{activeFinding.snippet}</code>
                        </pre>
                      </div>

                      {/* Suggestion Fix */}
                      <div className="border border-emerald-500/20 rounded-2xl bg-emerald-950/10 overflow-hidden">
                        <div className="bg-emerald-950/20 border-b border-emerald-500/15 px-4 py-2 text-[9px] font-bold text-emerald-450 uppercase tracking-wider">
                          Suggested Fix
                        </div>
                        <pre className="p-4 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                          <code>{activeFinding.suggestion}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto py-12 text-slate-500">
                  <ShieldAlert className="h-10 w-10 text-slate-600 mb-3" />
                  <span className="text-xs font-bold text-slate-400">No finding selected</span>
                  <p className="text-[10px] leading-relaxed mt-1">Select a finding from the left list to view diagnostics, snippets, and refactoring guidelines.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && findings.length === 0 && (
        <div className="p-12 bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
          <div className="bg-indigo-500/10 p-5 rounded-2xl text-indigo-400 border border-indigo-500/15">
            <CheckCircle className="h-9 w-9" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Codebase Audit Ready</h3>
            <p className="text-[11px] text-slate-450 leading-relaxed mt-1.5 font-semibold">
              Select a scope from the project database list and click Run Review Scan. The agent will execute regex checks to profile duplicate lines, naming violations, and performance issues.
            </p>
          </div>
          <Button
            onClick={handleStartReview}
            disabled={projects.length === 0}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-650 hover:bg-indigo-655 text-white font-bold rounded-xl text-xs shadow-lg"
          >
            <span>Scan Codebase</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
