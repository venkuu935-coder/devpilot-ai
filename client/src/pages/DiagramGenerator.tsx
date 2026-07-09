import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Loader2,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Folder,
  Eye,
  FileImage,
  Printer,
  Code
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Project {
  id: string;
  name: string;
}

interface DiagramTypeOpt {
  type: string;
  title: string;
  desc: string;
}

const diagramTypes: DiagramTypeOpt[] = [
  { type: 'flowchart', title: 'Flowchart', desc: 'Trace the application path, routing logic, and backend worker connections.' },
  { type: 'component', title: 'Component Diagram', desc: 'Visualize client interfaces, Express router middlewares, and DB services.' },
  { type: 'class', title: 'Class Diagram', desc: 'Inspect properties, functions, class boundaries, and entity data types.' },
  { type: 'sequence', title: 'Sequence Diagram', desc: 'Trace sequence steps of API requests from frontend through to database saves.' },
  { type: 'use_case', title: 'Use Case Diagram', desc: 'Model actor roles and interactions with codebase modules.' }
];

export const DiagramGenerator: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Selection states
  const [activeType, setActiveType] = useState<string>('flowchart');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  
  // Generating states
  const [diagramCode, setDiagramCode] = useState<string>('');
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

  const handleGenerateDiagram = async () => {
    if (!selectedProjectId || generating) return;
    setGenerating(true);
    setDiagramCode('');
    setError(null);

    try {
      const res = await fetch(`${FASTAPI_URL}/diagrams/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          diagram_type: activeType
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setDiagramCode(json.diagram_code);
        setActiveTab('visual');
      } else {
        throw new Error(json.detail || 'Diagram compilation failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to compile architecture diagram. Make sure the FastAPI server is running on port 8000. details: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!diagramCode) return;
    navigator.clipboard.writeText(diagramCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Base64 encode helper for mermaid.ink
  const getEncodedUrl = (format: 'svg' | 'img') => {
    if (!diagramCode) return '';
    try {
      // Escape non-ASCII characters to construct clean base64 variants
      const encoded = btoa(unescape(encodeURIComponent(diagramCode.trim())));
      return `https://mermaid.ink/${format}/${encoded}`;
    } catch (e) {
      console.error('Base64 encoding failed', e);
      return '';
    }
  };

  const handleDownloadSVG = async () => {
    const url = getEncodedUrl('svg');
    if (!url) return;
    try {
      const res = await fetch(url);
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${activeType}_diagram.svg`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download SVG', err);
      // Fallback open in new tab
      window.open(url, '_blank');
    }
  };

  const handleDownloadPNG = () => {
    const url = getEncodedUrl('img');
    if (!url) return;
    // Open URL directly as download or open in tab to save
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeType}_diagram.png`;
    a.target = '_blank';
    a.click();
  };

  const handleDownloadPDF = () => {
    const url = getEncodedUrl('svg');
    if (!url) return;
    
    // Create print iframe containing styled vector
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
    const title = `${projName} - ${activeType.toUpperCase()} DIAGRAM`;

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 20px;
              color: #020617;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 8px;
              margin-bottom: 24px;
            }
            .diagram-container {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-top: 40px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="diagram-container">
            <img src="${url}" />
          </div>
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
            <GitBranch className="h-6 w-6 text-indigo-400" />
            System Architecture Diagrams
          </h1>
          <p className="text-sm text-slate-400">Generate, render, and download systems architecture flowcharts and class mappings.</p>
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
              Upload a project ZIP to generate diagrams.
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
                  setDiagramCode('');
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
        {/* Left Panel: Diagram Categories selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Diagram Modules</h3>
            
            <div className="space-y-2.5">
              {diagramTypes.map((opt) => {
                const isSel = activeType === opt.type;
                return (
                  <div
                    key={opt.type}
                    onClick={() => {
                      setActiveType(opt.type);
                      setDiagramCode('');
                    }}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative group flex justify-between items-center ${
                      isSel
                        ? 'bg-indigo-650/10 border-indigo-500/30 text-indigo-300 shadow-md'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5 pr-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider">{opt.title}</h4>
                      <p className="text-[9px] text-slate-550 font-medium leading-relaxed group-hover:text-slate-400">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate Trigger */}
            <Button
              onClick={handleGenerateDiagram}
              disabled={projects.length === 0 || generating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-2 border border-white/10"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mapping elements...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Generate Diagram</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel: Render Workspace */}
        <div className="lg:col-span-2 p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl min-h-[500px] flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            {/* Header tab controls */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('visual')}
                  disabled={!diagramCode}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'visual'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-500 hover:text-slate-350 disabled:opacity-50'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Visual Preview</span>
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  disabled={!diagramCode}
                  className={`pb-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'code'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-500 hover:text-slate-350 disabled:opacity-50'
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  <span>Mermaid Code</span>
                </button>
              </div>

              {diagramCode && (
                <div className="flex items-center space-x-2">
                  {activeTab === 'code' ? (
                    <button
                      onClick={handleCopyCode}
                      className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                      title="Copy Mermaid Code"
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
                  ) : (
                    <>
                      <button
                        onClick={handleDownloadSVG}
                        className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                        title="Download SVG"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">SVG</span>
                      </button>
                      <button
                        onClick={handleDownloadPNG}
                        className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                        title="Download PNG"
                      >
                        <FileImage className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">PNG</span>
                      </button>
                      <button
                        onClick={handleDownloadPDF}
                        className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                        title="Export PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Diagram Display Feed */}
            {generating && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-24">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <div className="text-center">
                  <p className="text-xs text-slate-355 font-bold uppercase tracking-wider">Mapping Workspace</p>
                  <p className="text-[11px] text-slate-505 mt-1 font-medium">Scanning folders and compiling syntax parameters...</p>
                </div>
              </div>
            )}

            {!generating && !diagramCode && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5 py-24">
                <div className="bg-indigo-500/10 p-4.5 rounded-2xl ring-1 ring-white/10 text-indigo-400">
                  <GitBranch className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Generate Architecture Diagram</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-semibold mt-1">
                    Select a target repository configuration, choose a diagram type, and click compile. The agent will formulate systems mappings.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-455 text-xs">
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wide block">Diagram Generation Failure</span>
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {diagramCode && !generating && (
              <div className="flex-1 bg-slate-955 p-5 rounded-2xl border border-white/5 flex items-center justify-center overflow-auto max-h-[550px] custom-scrollbar shadow-inner">
                {activeTab === 'visual' ? (
                  <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-center min-h-[300px] w-full relative">
                    <img
                      src={getEncodedUrl('svg')}
                      alt={`${activeType} System Diagram`}
                      className="max-w-full h-auto object-contain transition-all duration-300"
                      onError={() => {
                        setError('Failed to render visual diagram from mermaid.ink. Try downloading the SVG or check the raw Mermaid code.');
                      }}
                    />
                  </div>
                ) : (
                  <pre className="w-full text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre self-start">
                    <code>{diagramCode}</code>
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Action Regenerate footer */}
          {diagramCode && !generating && (
            <div className="flex justify-end mt-6 border-t border-white/5 pt-4">
              <Button
                onClick={handleGenerateDiagram}
                className="flex items-center space-x-1.5 px-4 py-2 border border-indigo-500/20 bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-300 font-bold rounded-xl text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regenerate Diagram</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
