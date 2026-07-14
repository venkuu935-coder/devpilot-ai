import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  Plus,
  Trash2,
  Folder,
  Loader2,
  Copy,
  Check,
  Cpu,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  detectedLanguage?: string;
  detectedFramework?: string;
}

// Code Block component with Copy button
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-white/10 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl relative group">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-white/5 text-[10px] font-mono text-slate-400">
        <span className="uppercase font-bold text-indigo-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition-colors"
        >
          {copied ? (
            <span className="text-emerald-450 font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" /> Copy Code
            </span>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed custom-scrollbar max-h-96">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Simple Markdown parser to prevent rendering node_module crashes
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  // Split inline code blocks first: `code`
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-mono text-xs border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // Split bold stars: **text**
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
  // Split code blocks: ```lang ... ```
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="space-y-1 text-slate-350 text-sm">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.split('\n');
          const firstLine = lines[0];
          const lang = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, -1).join('\n');
          return <CodeBlock key={idx} language={lang} code={code} />;
        }
        
        // Split line by line for structured components (lists, headers)
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
              
              return <p key={lIdx} className="leading-relaxed">{parseInlineMarkdown(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export const AIChat: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Input and streaming states
  const [inputMessage, setInputMessage] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const API_URL = 'http://localhost:5000/api';
  const FASTAPI_URL = 'http://localhost:8000/api';

  // Load projects from node backend
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

  // Load threads from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('devpilot_chat_threads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatThread[];
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse chat threads', e);
      }
    }
  }, []);

  // Save threads to localStorage
  const saveThreads = (newThreads: ChatThread[]) => {
    setThreads(newThreads);
    localStorage.setItem('devpilot_chat_threads', JSON.stringify(newThreads));
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [threads, streamingResponse, activeThreadId]);

  const activeThread = threads.find(t => t.id === activeThreadId) || null;

  // Create a new thread
  const handleNewThread = () => {
    if (projects.length === 0) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const newThread: ChatThread = {
      id: `chat-${Math.random().toString(36).substring(2, 9)}`,
      projectId: project.id,
      projectName: project.name,
      title: `Query: ${project.name}`,
      messages: [],
      updatedAt: new Date().toISOString()
    };

    saveThreads([newThread, ...threads]);
    setActiveThreadId(newThread.id);
    setInputMessage('');
    setStreamingResponse('');
    setLoading(false);
  };

  // Delete thread
  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = threads.filter(t => t.id !== id);
    saveThreads(updated);
    if (activeThreadId === id) {
      setActiveThreadId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || !selectedProjectId) return;

    let currentThread = activeThread;
    let localThreads = [...threads];
    
    // Create thread if none is active
    if (!currentThread) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (!project) return;

      const newThread: ChatThread = {
        id: `chat-${Math.random().toString(36).substring(2, 9)}`,
        projectId: project.id,
        projectName: project.name,
        title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
        messages: [],
        updatedAt: new Date().toISOString()
      };

      currentThread = newThread;
      localThreads = [newThread, ...localThreads];
      setActiveThreadId(newThread.id);
    }

    // Append user message
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const threadWithUserMsg = {
      ...currentThread,
      messages: [...currentThread.messages, userMsg],
      updatedAt: new Date().toISOString()
    };

    localThreads = localThreads.map(t => t.id === currentThread!.id ? threadWithUserMsg : t);
    saveThreads(localThreads);
    setInputMessage('');
    setLoading(true);
    setStreamingResponse('');

    try {
      // Package payload history
      const formattedHistory = currentThread.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${FASTAPI_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: currentThread.projectId,
          message: text,
          history: formattedHistory
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Response body is empty');
      }

      // Stream Reader
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
          setStreamingResponse(accum);
        }
      }

      // Append model message on finish
      const modelMsg: Message = {
        role: 'model',
        content: accum,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalThread = {
        ...threadWithUserMsg,
        messages: [...threadWithUserMsg.messages, modelMsg],
        updatedAt: new Date().toISOString()
      };

      const finalThreads = localThreads.map(t => t.id === currentThread!.id ? finalThread : t);
      saveThreads(finalThreads);
      setStreamingResponse('');
    } catch (err: any) {
      console.error('Streaming failed', err);
      // Append error message
      const errorMsg: Message = {
        role: 'model',
        content: `Error contacting AI Chat service. Make sure the FastAPI backend is running on port 8000. details: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const errorThread = {
        ...threadWithUserMsg,
        messages: [...threadWithUserMsg.messages, errorMsg]
      };
      saveThreads(localThreads.map(t => t.id === currentThread!.id ? errorThread : t));
    } finally {
      setLoading(false);
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (!activeThread || activeThread.messages.length < 2 || loading) return;
    
    // Find last user question
    const history = [...activeThread.messages];
    const lastUserMsgIdx = history.map(m => m.role).lastIndexOf('user');
    
    if (lastUserMsgIdx === -1) return;
    
    const lastUserQuestion = history[lastUserMsgIdx].content;
    
    // Rollback thread to before user question
    const rolledBackMessages = history.slice(0, lastUserMsgIdx);
    const rolledBackThread = {
      ...activeThread,
      messages: rolledBackMessages,
      updatedAt: new Date().toISOString()
    };

    saveThreads(threads.map(t => t.id === activeThread.id ? rolledBackThread : t));
    
    // Re-trigger
    handleSendMessage(lastUserQuestion);
  };

  const getSuggestedQuestions = () => {
    if (!activeThread) return [
      "Explain the folder structure of this project",
      "Which frameworks and frameworks are imported?",
      "Suggest unit test formats for this codebase",
      "Scan files to find security risks"
    ];
    return [
      "Review files to find security issues or keys",
      "How is routing configured in this workspace?",
      "Optimize the database connection pattern",
      "Draft a setup guide for new developers"
    ];
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -my-8 overflow-hidden font-sans">
      {/* Sidebar - Threads list */}
      <div className="w-80 bg-slate-900/60 backdrop-blur-md border-r border-white/5 flex flex-col h-full">
        {/* Project Selector */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target codebase</label>
          {projectsLoading ? (
            <div className="flex items-center space-x-2 text-slate-500 text-xs py-2">
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-slate-550 text-xs py-2 bg-slate-950/40 px-3 rounded-xl border border-white/5">
              No projects uploaded. Go to Projects page to upload a ZIP.
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={handleNewThread}
            disabled={projects.length === 0}
            className="w-full py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Chat Thread</span>
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2 mb-2">History</span>
          
          {threads.length === 0 ? (
            <div className="text-center text-[11px] text-slate-500 py-12 px-4">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-slate-600" />
              No conversation history.
            </div>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 group border ${
                  activeThreadId === t.id
                    ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30 shadow-md'
                    : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate pr-2">
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-350" />
                  <span className="truncate">{t.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteThread(t.id, e)}
                  className="p-1 rounded-md text-slate-650 hover:text-rose-450 hover:bg-rose-500/15 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5 filter blur-3xl pointer-events-none"></div>

        {/* Workspace Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Cpu className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">DevPilot AI Assistant</span>
              {activeThread && (
                <div className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
                  <Folder className="h-3 w-3" /> Scope: {activeThread.projectName}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
          {!activeThread || activeThread.messages.length === 0 ? (
            // Welcome workspace
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="bg-indigo-500/10 p-4.5 rounded-2xl ring-1 ring-white/10 mb-6 text-indigo-400">
                <Sparkles className="h-8 w-8 animate-bounce" />
              </div>
              
              <h2 className="text-xl font-bold text-white tracking-tight">Chat with your codebase</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-2 mb-8 leading-relaxed font-medium">
                DevPilot parses your repository folders and answers architectural queries, refactors files, or suggests integrations.
              </p>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {getSuggestedQuestions().map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="p-3 text-left bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-xl text-[11px] font-semibold text-slate-350 hover:text-white transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message feed
            <div className="space-y-6">
              {activeThread.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-5 py-3.5 rounded-2xl shadow-xl relative overflow-hidden border ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-650 text-white border-indigo-500/30'
                        : 'bg-slate-900/80 backdrop-blur-md border-white/5'
                    }`}
                  >
                    {/* Timestamp */}
                    <span className="text-[9px] font-bold text-slate-500 absolute top-2 right-4">
                      {m.timestamp}
                    </span>

                    {/* Rendering message contents */}
                    {m.role === 'user' ? (
                      <p className="text-sm font-medium pr-12 leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="pr-1">
                        <MarkdownRenderer text={m.content} />
                        
                        {/* Action buttons */}
                        {idx === activeThread.messages.length - 1 && !loading && (
                          <div className="flex space-x-2.5 mt-4 border-t border-white/5 pt-3 text-[10px] font-bold text-slate-450">
                            <button
                              onClick={handleRegenerate}
                              className="flex items-center space-x-1 hover:text-white transition-colors"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Regenerate Response</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming placeholder bubble */}
              {loading && streamingResponse && (
                <div className="flex justify-start">
                  <div className="max-w-2xl px-5 py-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/5 shadow-xl">
                    <MarkdownRenderer text={streamingResponse} />
                    <div className="flex items-center space-x-1.5 mt-3 text-[10px] text-indigo-400 font-bold">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Streaming details...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading thinking bubble */}
              {loading && !streamingResponse && (
                <div className="flex justify-start">
                  <div className="px-5 py-3.5 rounded-2xl bg-slate-900/80 border border-white/5 shadow-xl flex items-center space-x-2 text-xs font-semibold text-slate-400">
                    <Loader2 className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
                    <span>Analyzing repository workspace files...</span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950/20 backdrop-blur border-t border-white/5 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputMessage);
            }}
            className="flex items-center space-x-3 bg-slate-950 border border-slate-800 focus-within:border-indigo-500/50 rounded-2xl px-4 py-2.5 shadow-inner"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={projects.length === 0 ? "Upload a project to start chat..." : "Ask DevPilot about your files..."}
              disabled={projects.length === 0 || loading}
              className="flex-1 bg-transparent text-sm text-slate-150 outline-none placeholder-slate-500"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
