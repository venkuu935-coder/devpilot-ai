import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
  Github,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Database,
  Search,
  Cpu,
  Code2
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface Project {
  id: string;
  name: string;
  description?: string;
  sourceType: 'zip' | 'github';
  sourceUrl?: string;
  status: string;
  validationErrors?: string;
  fileCount: number;
  totalSize: number;
  detectedLanguage?: string;
  detectedFramework?: string;
  dependencies?: Record<string, string>;
  detectedDatabase?: string;
  apiFramework?: string;
  summary?: string;
  fileStructure: string[];
  createdAt: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  path: string;
}

// Tree builder helper for the file explorer
const buildTree = (paths: string[]): FileNode[] => {
  const root: FileNode[] = [];

  paths.forEach((p) => {
    const parts = p.split('/');
    let currentLevel = root;
    let accumulatedPath = '';

    parts.forEach((part, index) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      const type = isLast ? 'file' : 'directory';

      let node = currentLevel.find((n) => n.name === part && n.type === type);
      if (!node) {
        node = { name: part, type, path: accumulatedPath };
        if (type === 'directory') {
          node.children = [];
        }
        currentLevel.push(node);
      }
      if (type === 'directory') {
        currentLevel = node.children!;
      }
    });
  });

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children) sortNodes(n.children);
    });
  };

  sortNodes(root);
  return root;
};

// Recursive File Tree Node component
const TreeNode: React.FC<{ node: FileNode; depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(depth === 0); // Keep root folders open initially
  const isDirectory = node.type === 'directory';

  return (
    <div className="select-none text-xs font-mono">
      <div
        className="flex items-center space-x-1.5 py-1 px-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => isDirectory && setIsOpen(!isOpen)}
      >
        {isDirectory ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
            <Folder className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="text-slate-200 font-semibold">{node.name}</span>
          </>
        ) : (
          <>
            <div className="w-3.5 h-3.5 shrink-0" />
            <File className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-350">{node.name}</span>
          </>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-[1px] bg-slate-800"
            style={{ marginLeft: `${depth * 12 + 15}px` }}
          />
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Projects: React.FC = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Scanner UI States
  const [detailTab, setDetailTab] = useState<'overview' | 'dependencies' | 'files'>('overview');
  const [scanning, setScanning] = useState(false);
  const [searchDepQuery, setSearchDepQuery] = useState('');

  // Modal / Uploading State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'zip' | 'github'>('zip');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload progress simulation and network stats
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Drag and Drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = 'http://localhost:5000/api';

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProjects(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  // Clean form inputs
  const resetForm = () => {
    setProjectName('');
    setProjectDesc('');
    setGithubUrl('');
    setSelectedFile(null);
    setError(null);
    setProgress(0);
    setStatusText('');
  };

  // Trigger codebase scanner manually
  const handleRescan = async () => {
    if (!selectedProject) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/projects/${selectedProject.id}/scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedProject(json.data);
        fetchProjects();
      } else {
        setError(json.error || 'Failed to scan codebase.');
        // Show scan error in standard modal or detail view
        alert(json.error || 'Failed to scan codebase.');
      }
    } catch (err) {
      setError('Connection error while running codebase scanner.');
    } finally {
      setScanning(false);
    }
  };

  // ZIP drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
        if (!projectName) {
          // prefill project name with zip name
          setProjectName(file.name.replace('.zip', ''));
        }
      } else {
        setError('Only ZIP files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!projectName) {
        setProjectName(file.name.replace('.zip', ''));
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // ZIP Upload Action
  const handleZipUpload = () => {
    if (!selectedFile || !projectName) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setStatusText('Uploading ZIP file...');

    const formData = new FormData();
    formData.append('name', projectName);
    formData.append('description', projectDesc);
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/projects/upload`);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentage = Math.round((e.loaded / e.total) * 100);
        setProgress(percentage);
        if (percentage === 100) {
          setStatusText('Extracting files and performing codebase checks...');
        }
      }
    });

    xhr.onload = () => {
      if (xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          setUploading(false);
          setIsModalOpen(false);
          setSelectedProject(response.data);
          fetchProjects();
          resetForm();
        } catch (e) {
          setError('Failed to parse server response.');
          setUploading(false);
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          setError(response.error || 'Failed to upload project ZIP.');
        } catch (e) {
          setError(`HTTP Error ${xhr.status}`);
        }
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError('Network connection error.');
      setUploading(false);
    };

    xhr.send(formData);
  };

  // GitHub import Action
  const handleGithubUpload = async () => {
    if (!projectName || !githubUrl) return;
    setUploading(true);
    setError(null);
    setProgress(15);
    setStatusText('Connecting to GitHub API...');

    // Simulate progress updates for a smoother visual experience
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        if (prev >= 75) {
          setStatusText('Validating workspace file tree...');
          return prev + 3;
        }
        if (prev >= 45) {
          setStatusText('Extracting codebase from zipball...');
          return prev + 8;
        }
        setStatusText('Downloading repository package...');
        return prev + 12;
      });
    }, 700);

    try {
      const res = await fetch(`${API_URL}/projects/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          githubUrl: githubUrl,
        }),
      });

      clearInterval(interval);
      const json = await res.json();

      if (res.ok && json.success) {
        setProgress(100);
        setStatusText('Project imported successfully!');
        setTimeout(() => {
          setUploading(false);
          setIsModalOpen(false);
          setSelectedProject(json.data);
          fetchProjects();
          resetForm();
        }, 500);
      } else {
        setError(json.error || 'Failed to download GitHub repository.');
        setUploading(false);
      }
    } catch (err) {
      clearInterval(interval);
      setError('Server connection error.');
      setUploading(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail view
    if (!confirm('Are you sure you want to delete this project and all its files?')) return;

    try {
      const res = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (selectedProject?.id === id) {
          setSelectedProject(null);
        }
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // Byte size Formatter
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Build the tree nodes from the project structure
  const fileNodes = selectedProject ? buildTree(selectedProject.fileStructure) : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      {!selectedProject ? (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-sm text-slate-400">Upload and browse your project workspaces.</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Project</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedProject(null)}
            className="p-2.5 bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-all shadow-inner"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {selectedProject.name}
              <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
                {selectedProject.detectedLanguage}
              </span>
            </h1>
            <p className="text-sm text-slate-400">{selectedProject.description || 'No description provided.'}</p>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading workspaces...</p>
        </div>
      ) : !selectedProject ? (
        // Projects Grid View
        projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-24 bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-3xl text-center">
            <div className="bg-indigo-500/10 p-5 rounded-2xl ring-1 ring-white/10 mb-5">
              <Upload className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">No projects found</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-2 mb-6">
              You haven't uploaded any projects yet. Drag-and-drop a ZIP file or insert a GitHub Repository URL to start.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              Upload Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                whileHover={{ scale: 1.01, borderColor: 'rgba(99, 102, 241, 0.3)' }}
                onClick={() => setSelectedProject(project)}
                className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 hover:border-indigo-500/30 rounded-3xl cursor-pointer flex flex-col justify-between group transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-500/5 filter blur-2xl group-hover:blur-3xl transition-all"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors ring-1 ring-white/5">
                      {project.sourceType === 'github' ? (
                        <Github className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />
                      ) : (
                        <Folder className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{project.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 line-clamp-2">{project.description || 'No description provided.'}</p>
                </div>

                <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                  <div className="flex space-x-4 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      {project.fileCount} files
                    </span>
                    <span>{formatSize(project.totalSize)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 border border-white/5 rounded-md">
                      {project.detectedLanguage || 'Unknown'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        // Detailed Selected Project View
        <div className="space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-white/5 space-x-6">
            <button
              onClick={() => setDetailTab('overview')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                detailTab === 'overview'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setDetailTab('dependencies')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                detailTab === 'dependencies'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Dependencies ({Object.keys(selectedProject.dependencies || {}).length})
            </button>
            <button
              onClick={() => setDetailTab('files')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                detailTab === 'files'
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              File Explorer ({selectedProject.fileCount})
            </button>
          </div>

          {/* Details Content */}
          {detailTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary and Stats */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Summary</h3>
                  <p className="text-sm text-slate-350 leading-relaxed font-medium">
                    {selectedProject.summary || 'No summary generated yet. Run a codebase scan to analyze framework details.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/10">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-450 block mb-1 font-semibold uppercase tracking-wider">Primary Language</span>
                    <span className="text-lg font-extrabold text-white">{selectedProject.detectedLanguage || 'Unknown'}</span>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-purple-500/10 p-2.5 rounded-xl text-purple-400 border border-purple-500/10">
                      <Code2 className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-455 block mb-1 font-semibold uppercase tracking-wider">Framework</span>
                    <span className="text-lg font-extrabold text-white">{selectedProject.detectedFramework || 'None'}</span>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/10">
                      <Database className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-460 block mb-1 font-semibold uppercase tracking-wider">Database</span>
                    <span className="text-lg font-extrabold text-white">{selectedProject.detectedDatabase || 'None'}</span>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/10">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-465 block mb-1 font-semibold uppercase tracking-wider">API Framework</span>
                    <span className="text-lg font-extrabold text-white">{selectedProject.apiFramework || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Scanning Trigger & Settings */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Repository Actions</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-xs text-slate-400">Source Type</span>
                      <span className="text-sm font-bold text-white capitalize">{selectedProject.sourceType}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-xs text-slate-400">Unpacked Size</span>
                      <span className="text-sm font-bold text-white font-mono">{formatSize(selectedProject.totalSize)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-xs text-slate-400">Total File Count</span>
                      <span className="text-sm font-bold text-white font-mono">{selectedProject.fileCount}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleRescan}
                    disabled={scanning}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center space-x-2 border border-white/10"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Scanning codebase...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="h-4 w-4" />
                        <span>Re-scan Codebase</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {detailTab === 'dependencies' && (
            <div className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Codebase Dependencies</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Libraries and tools detected in the project configuration files.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchDepQuery}
                    onChange={(e) => setSearchDepQuery(e.target.value)}
                    placeholder="Search packages..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-xl pl-9 pr-4 py-2 outline-none text-xs"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              {Object.keys(selectedProject.dependencies || {}).length === 0 ? (
                <div className="py-12 text-center text-slate-550 text-xs">
                  No manifest dependencies were parsed. Supported manifests include package.json, requirements.txt, go.mod, Cargo.toml, and pom.xml.
                </div>
              ) : (
                <div className="border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3.5">Package</th>
                        <th className="px-5 py-3.5">Detected Version</th>
                        <th className="px-5 py-3.5">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {Object.entries(selectedProject.dependencies || {})
                        .filter(([pkg]) => pkg.toLowerCase().includes(searchDepQuery.toLowerCase()))
                        .map(([pkg, ver]) => {
                          const isDev = pkg.startsWith('@types/') || pkg.includes('eslint') || pkg.includes('prettier') || pkg.includes('jest') || pkg.includes('typescript');
                          return (
                            <tr key={pkg} className="hover:bg-white/5 transition-colors">
                              <td className="px-5 py-3 font-semibold text-slate-200 font-mono">{pkg}</td>
                              <td className="px-5 py-3 text-slate-400 font-mono">{ver as string}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isDev
                                    ? 'bg-purple-550/10 text-purple-300 border border-purple-500/20'
                                    : 'bg-indigo-550/10 text-indigo-300 border border-indigo-500/20'
                                }`}>
                                  {isDev ? 'Development' : 'Production'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {detailTab === 'files' && (
            <div className="p-6 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-3xl flex flex-col h-[600px]">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">File Explorer</h3>
                  <p className="text-[11px] text-slate-400">Hierarchy mapped relative to the workspace directory.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {fileNodes.length > 0 ? (
                  fileNodes.map((node) => (
                    <TreeNode key={node.path} node={node} depth={0} />
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Empty project structure.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Project Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="absolute -left-12 -top-12 w-36 h-36 rounded-full bg-indigo-500/5 filter blur-3xl"></div>

              {!uploading ? (
                <>
                  {/* Modal Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">Upload New Project</h3>
                    <p className="text-xs text-slate-400 mt-1">Provide your workspace details and code repository.</p>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-white/5 mb-6">
                    <button
                      onClick={() => setUploadTab('zip')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                        uploadTab === 'zip'
                          ? 'border-indigo-500 text-indigo-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      <span>ZIP Archive</span>
                    </button>
                    <button
                      onClick={() => setUploadTab('github')}
                      className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                        uploadTab === 'github'
                          ? 'border-indigo-500 text-indigo-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Github className="h-4 w-4" />
                      <span>GitHub Repository</span>
                    </button>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Project Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. ecommerce-gateway"
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl px-4 py-3 outline-none text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Description (Optional)</label>
                      <textarea
                        value={projectDesc}
                        onChange={(e) => setProjectDesc(e.target.value)}
                        placeholder="Describe the service, stack or architecture..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl px-4 py-3 outline-none text-sm transition-all resize-none"
                      />
                    </div>

                    {/* ZIP Dropzone */}
                    {uploadTab === 'zip' && (
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Code ZIP Archive</label>
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={triggerFileSelect}
                          className={`w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                            dragActive
                              ? 'border-indigo-500 bg-indigo-500/5'
                              : selectedFile
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".zip"
                            className="hidden"
                          />
                          {selectedFile ? (
                            <>
                              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 mb-3 text-emerald-400">
                                <CheckCircle2 className="h-6 w-6" />
                              </div>
                              <span className="text-sm font-bold text-slate-200 block truncate max-w-xs">{selectedFile.name}</span>
                              <span className="text-xs text-slate-400 mt-1">{formatSize(selectedFile.size)}</span>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-900 p-3 rounded-xl border border-white/5 mb-3 text-slate-400 group-hover:text-slate-300">
                                <Upload className="h-6 w-6" />
                              </div>
                              <span className="text-sm text-slate-300 font-semibold">Drag & Drop project ZIP file here</span>
                              <span className="text-xs text-slate-500 mt-1">or click to browse local files (max 50MB)</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* GitHub Input */}
                    {uploadTab === 'github' && (
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">GitHub Repository URL</label>
                        <div className="relative">
                          <input
                            type="url"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl pl-11 pr-4 py-3 outline-none text-sm transition-all"
                          />
                          <Github className="h-5 w-5 text-slate-500 absolute left-4 top-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                          Note: Currently public repositories are supported directly.
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-rose-400 text-xs">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <span className="font-semibold">{error}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 mt-6 border-t border-white/5 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-300 font-semibold rounded-xl text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        uploadTab === 'zip'
                          ? !selectedFile || !projectName
                          : !projectName || !githubUrl
                      }
                      onClick={uploadTab === 'zip' ? handleZipUpload : handleGithubUpload}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20"
                    >
                      Import Workspace
                    </Button>
                  </div>
                </>
              ) : (
                // Processing & Uploading Screen
                <div className="py-8 flex flex-col items-center text-center space-y-6">
                  {/* Glowing progress ring indicator */}
                  <div className="relative h-28 w-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * progress) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-300"
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-white tracking-tight">{progress}%</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Progress</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Importing Workspace</h3>
                    <p className="text-xs text-slate-400 font-medium px-4">{statusText}</p>
                  </div>

                  <div className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-full h-2 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
