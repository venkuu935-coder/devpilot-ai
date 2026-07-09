import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  BookOpen,
  Folder,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Project {
  id: string;
  name: string;
}

interface DocCategory {
  type: string;
  title: string;
  desc: string;
}

const docCategories: DocCategory[] = [
  { type: 'readme', title: 'README Document', desc: 'Codebase overview, tech stack, and rapid setup guides.' },
  { type: 'installation', title: 'Installation Guide', desc: 'Pre-requisites, install scripts, and dev config variables.' },
  { type: 'api', title: 'API Reference Manual', desc: 'Router gateways, payload shapes, headers, and status codes.' },
  { type: 'database', title: 'Database Document', desc: 'Prisma entities, SQL configurations, and relation mappings.' },
  { type: 'folder', title: 'Folder Structure', desc: 'Folder hierarchies and recursive directory details.' },
  { type: 'architecture', title: 'Systems Architecture', desc: 'Express API gateway routing, FastAPI AI services, and TS links.' },
  { type: 'deployment', title: 'Production DevOps', desc: 'Dockerfiles, compilation pipelines, and cloud deploys.' }
];

// Helper components for local Markdown parsing
const CodeBlock: React.FC<{ language: string; code: string }> = ({ code }) => {
  return (
    <div className="my-4 border border-white/10 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-mono text-xs border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={`${idx}-${bIdx}`} className="font-extrabold text-white">{bPart.slice(2, -2)}</strong>;
      }
      return bPart;
    });
  });
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-1 text-slate-350 text-sm leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.split('\n');
          const code = lines.slice(1, -1).join('\n');
          return <CodeBlock key={idx} language="code" code={code} />;
        }
        
        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-2" />;
              
              if (line.startsWith('# ')) {
                return <h1 key={lIdx} className="text-xl font-bold text-white mt-4 mb-2 first:mt-1">{parseInlineMarkdown(line.substring(2))}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={lIdx} className="text-lg font-bold text-white mt-3 mb-1.5">{parseInlineMarkdown(line.substring(3))}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={lIdx} className="text-base font-bold text-white mt-2 mb-1">{parseInlineMarkdown(line.substring(4))}</h3>;
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <ul key={lIdx} className="list-disc pl-5 my-1.5 text-slate-300">
                    <li className="pl-1">{parseInlineMarkdown(line.substring(2))}</li>
                  </ul>
                );
              }
              if (/^\d+\.\s/.test(line)) {
                const match = line.match(/^(\d+\.\s)(.*)/);
                return (
                  <ol key={lIdx} className="list-decimal pl-5 my-1.5 text-slate-300">
                    <li className="pl-1">{parseInlineMarkdown(match ? match[2] : line)}</li>
                  </ol>
                );
              }
              return <p key={lIdx}>{parseInlineMarkdown(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// Inline helper to convert markdown to basic HTML structures for printing
const parseMarkdownToHtmlForPrint = (text: string): string => {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
  });
  
  const lines = escaped.split('\n');
  const processed = lines.map(line => {
    if (!line.trim()) return '<br/>';
    
    if (line.startsWith('# ')) return `<h1>${parseInlineMarkdownHtml(line.substring(2))}</h1>`;
    if (line.startsWith('## ')) return `<h2>${parseInlineMarkdownHtml(line.substring(3))}</h2>`;
    if (line.startsWith('### ')) return `<h3>${parseInlineMarkdownHtml(line.substring(4))}</h3>`;
    
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return `<ul><li>${parseInlineMarkdownHtml(line.substring(2))}</li></ul>`;
    }
    
    const numMatch = line.match(/^(\d+\.\s)(.*)/);
    if (numMatch) {
      return `<ol><li>${parseInlineMarkdownHtml(numMatch[2])}</li></ol>`;
    }
    
    return `<p>${parseInlineMarkdownHtml(line)}</p>`;
  });
  
  return processed.join('\n');
};

const parseInlineMarkdownHtml = (text: string): string => {
  let res = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/`([^`]+)`/g, '<code>$1</code>');
  return res;
};

export const Documentation: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('readme');
  
  // Generating states
  const [docText, setDocText] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
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

  const handleGenerateDocs = async () => {
    if (!selectedProjectId || !activeCategory || generating) return;
    setGenerating(true);
    setDocText('');
    setError(null);

    try {
      const res = await fetch(`${FASTAPI_URL}/docs/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          doc_type: activeCategory
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
          setDocText(accum);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to compile repository documentation. Make sure the FastAPI backend is running on port 8000. details: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadMD = () => {
    if (!docText) return;
    const blob = new Blob([docText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCategory}_${selectedProjectId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!docText) return;
    
    // Create print iframe
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
    
    const proj = projects.find(p => p.id === selectedProjectId);
    const projName = proj ? proj.name : selectedProjectId;
    const title = `${projName} - ${activeCategory.toUpperCase()}`;

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
            h1 {
              font-size: 26px;
              color: #020617;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 10px;
              margin-top: 0;
            }
            h2 {
              font-size: 18px;
              color: #1e293b;
              margin-top: 24px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
            }
            p, ul, ol {
              font-size: 13px;
              margin: 10px 0;
            }
            code {
              font-family: SFMono-Regular, Consolas, monospace;
              background-color: #f8fafc;
              color: #a855f7;
              padding: 2px 4px;
              border-radius: 4px;
              font-size: 11px;
            }
            pre {
              background-color: #0f172a;
              color: #cbd5e1;
              border-radius: 8px;
              padding: 16px;
              overflow-x: auto;
              margin: 16px 0;
            }
            pre code {
              background-color: transparent;
              color: inherit;
              padding: 0;
            }
            @media print {
              body {
                padding: 0;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            }
          </style>
        </head>
        <body>
          <div id="content"></div>
        </body>
      </html>
    `;
    
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    const contentEl = iframeDoc.getElementById('content');
    if (contentEl) {
      contentEl.innerHTML = parseMarkdownToHtmlForPrint(docText);
    }
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 400);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Documentation Agent</h1>
          <p className="text-sm text-slate-400">Generate, compile, and download documentation folders for your codebases.</p>
        </div>
        
        {/* Project Selector dropdown */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {loadingProjects ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-slate-550 text-xs py-2 bg-slate-950/40 px-3 rounded-xl border border-white/5">
              Upload a project ZIP to generate documents.
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
                  setDocText('');
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Selection Cards */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">Doc Modules</span>
          
          {docCategories.map((cat) => {
            const isSelected = activeCategory === cat.type;
            return (
              <div
                key={cat.type}
                onClick={() => {
                  setActiveCategory(cat.type);
                  setDocText('');
                  setError(null);
                }}
                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative group flex justify-between items-center ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {cat.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed group-hover:text-slate-400">{cat.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 shrink-0 ml-2 group-hover:text-indigo-400 transition-colors" />
              </div>
            );
          })}
        </div>

        {/* Documentation Viewer Workspace */}
        <div className="lg:col-span-3 p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl min-h-[500px] flex flex-col justify-between">
          <div>
            {/* Header controls for Document module */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {docCategories.find(c => c.type === activeCategory)?.title || 'Repository Document'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {getSelectedProjectName() ? `Compiled for workspace: ${getSelectedProjectName()}` : 'Select a project to start compilation'}
                </p>
              </div>

              {docText && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadMD}
                    className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                    title="Download Markdown"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">MD</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="p-2 bg-slate-950 border border-white/5 hover:bg-slate-900 text-slate-400 hover:text-indigo-350 rounded-xl transition-all shadow-inner flex items-center gap-1.5 text-xs font-semibold"
                    title="Download PDF Report"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document display feed */}
            {generating && !docText && (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                <div className="text-center">
                  <p className="text-xs text-slate-350 font-bold uppercase tracking-wider">Triggering Agent</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">Scanning directory structure and creating summaries...</p>
                </div>
              </div>
            )}

            {!generating && !docText && !error && (
              <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5">
                <div className="bg-indigo-500/10 p-4.5 rounded-2xl ring-1 ring-white/10 text-indigo-400">
                  <Sparkles className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Generate Codebase Document</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-medium mt-1">
                    Select a target repository scope and click compile. The AI Documentation Agent parses project files to write markdown files.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateDocs}
                  disabled={projects.length === 0}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg"
                >
                  <span>Build Document</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-450 text-xs">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <span className="font-bold uppercase tracking-wide block">Compilation Error</span>
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {docText && (
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 prose prose-invert max-w-none prose-xs overflow-y-auto max-h-[550px] custom-scrollbar">
                <MarkdownRenderer text={docText} />
                
                {/* Gen status indicators */}
                {generating && (
                  <div className="flex items-center space-x-2 mt-6 border-t border-white/5 pt-4 text-xs text-indigo-400 font-bold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Writing documentation blocks...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Regenerate footer */}
          {docText && !generating && (
            <div className="flex justify-end mt-6 border-t border-white/5 pt-4">
              <Button
                onClick={handleGenerateDocs}
                className="flex items-center space-x-1.5 px-4 py-2 border border-indigo-500/20 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-bold rounded-xl text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regenerate Module</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
