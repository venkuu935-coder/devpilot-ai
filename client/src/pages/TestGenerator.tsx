import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Loader2,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Folder,
  Code
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Project {
  id: string;
  name: string;
}

interface TestTypeOpt {
  type: string;
  title: string;
  desc: string;
}

const testTypes: TestTypeOpt[] = [
  { type: 'unit', title: 'Unit Tests', desc: 'Isolate and test individual service functions and helper routines.' },
  { type: 'integration', title: 'Integration Tests', desc: 'Verify coordination between database queries and Express routers.' },
  { type: 'api', title: 'API Tests', desc: 'Mock HTTP assertions verifying request payloads and status codes.' },
  { type: 'edge_case', title: 'Edge Cases', desc: 'Assert limits, empty attributes, null exceptions, and data borders.' }
];

export const TestGenerator: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Selection states
  const [selectedLanguage, setSelectedLanguage] = useState<string>('typescript');
  const [selectedType, setSelectedType] = useState<string>('unit');
  
  // Generating states
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setLoadingProjects(false);
      }
    };
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const handleGenerateTests = async () => {
    if (!selectedProjectId || generating) return;
    setGenerating(true);
    setGeneratedCode('');
    setError(null);

    try {
      const res = await fetch(`${FASTAPI_URL}/tests/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          test_type: selectedType,
          language: selectedLanguage
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Response stream is empty.');
      }

      // Stream parsing
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accum = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accum += chunk;
          setGeneratedCode(accum);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to compile test suite. Make sure the FastAPI server is running on port 8000. details: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!generatedCode) return;
    
    // Select appropriate extensions based on target specifications
    let ext = 'js';
    let filename = '';
    const typeLabel = selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
    
    if (selectedLanguage === 'java') {
      ext = 'java';
      filename = `${typeLabel}Test.${ext}`;
    } else if (selectedLanguage === 'typescript') {
      ext = 'ts';
      filename = `${selectedType}_spec.test.${ext}`;
    } else {
      filename = `${selectedType}_spec.test.${ext}`;
    }

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSelectedProjectName = () => {
    const proj = projects.find(p => p.id === selectedProjectId);
    return proj ? proj.name : '';
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode className="h-6 w-6 text-indigo-400" />
            Automated Test Generator
          </h1>
          <p className="text-sm text-slate-400">Scan codebase files and compile Unit, Integration, API, and Edge Case test assertions.</p>
        </div>
        
        {/* Project Selector dropdown */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {loadingProjects ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-slate-555 text-xs py-2 bg-slate-950/40 px-3 rounded-xl border border-white/5">
              Upload a project ZIP to generate tests.
            </div>
          ) : (
            <div className="flex items-center space-x-3 w-full">
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold shrink-0">
                <Folder className="h-4 w-4" />
                <span>Scope:</span>
              </div>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setGeneratedCode('');
                }}
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Test Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Test Suite Config</h3>
            
            {/* Language Options */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Language</label>
              <div className="grid grid-cols-3 gap-2">
                {['javascript', 'typescript', 'java'].map((lang) => {
                  const isSel = selectedLanguage === lang;
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setGeneratedCode('');
                      }}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all duration-300 capitalize ${
                        isSel
                          ? 'bg-indigo-650/15 border-indigo-500/35 text-indigo-300'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'javascript' ? 'JS' : lang === 'typescript' ? 'TS' : 'Java'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Type Selection Cards */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Test Type</label>
              <div className="space-y-2.5">
                {testTypes.map((opt) => {
                  const isSel = selectedType === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => {
                        setSelectedType(opt.type);
                        setGeneratedCode('');
                      }}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative group flex justify-between items-center ${
                        isSel
                          ? 'bg-indigo-650/10 border-indigo-500/30 text-indigo-300 shadow-md'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider">{opt.title}</h4>
                        <p className="text-[9px] text-slate-500 font-medium leading-relaxed group-hover:text-slate-405">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate Trigger */}
            <Button
              onClick={handleGenerateTests}
              disabled={projects.length === 0 || generating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 border border-white/10"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Compiling assertions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Generate Test Suite</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel: Code Workspace Viewer */}
        <div className="lg:col-span-2 p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl min-h-[500px] flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            {/* Header controls */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Code className="h-3.5 w-3.5 text-indigo-400" />
                  Code Output
                </h3>
                <p className="text-[10px] text-slate-405 font-medium">
                  {getSelectedProjectName() ? `Generated for workspace: ${getSelectedProjectName()}` : 'Select settings and click generate'}
                </p>
              </div>

              {generatedCode && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                    title="Copy Test Code"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-450" />
                        <span className="text-emerald-450 hidden sm:inline">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadFile}
                    className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                    title="Download Code File"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document display feed */}
            {generating && !generatedCode && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-24">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <div className="text-center">
                  <p className="text-xs text-slate-350 font-bold uppercase tracking-wider">Test Generator Active</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Analyzing dependencies and framing mock environments...</p>
                </div>
              </div>
            )}

            {!generating && !generatedCode && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5 py-24">
                <div className="bg-indigo-500/10 p-4.5 rounded-2xl ring-1 ring-white/10 text-indigo-400">
                  <FileCode className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Generate Codebase Test Suite</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-1">
                    Select a target repository configuration, choose JavaScript/TypeScript/Java settings, and click compile. The agent will formulate target assertions.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-455 text-xs">
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wide block">Test Generator Failure</span>
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {generatedCode && (
              <div className="flex-1 bg-slate-955 p-5 rounded-2xl border border-white/5 overflow-y-auto max-h-[550px] custom-scrollbar shadow-inner relative group">
                <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
                  <code>{generatedCode}</code>
                </pre>
                
                {generating && (
                  <div className="flex items-center space-x-2 mt-6 border-t border-white/5 pt-4 text-xs text-indigo-400 font-bold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Streaming test assertions...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Regenerate footer */}
          {generatedCode && !generating && (
            <div className="flex justify-end mt-6 border-t border-white/5 pt-4">
              <Button
                onClick={handleGenerateTests}
                className="flex items-center space-x-1.5 px-4 py-2 border border-indigo-500/20 bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-300 font-bold rounded-xl text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regenerate Test Suite</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
