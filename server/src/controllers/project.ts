import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { fallbackProjects, ProjectFallback } from '../utils/fallbackAuthDb.js';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { scanRepository } from '../utils/scanner.js';

const prisma = new PrismaClient();

// Helper to determine if Prisma is active and connected
async function isDbConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    return false;
  }
}

// GET /api/projects
export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const projects = await prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const formatted = projects.map(p => ({
        ...p,
        dependencies: p.dependencies ? JSON.parse(p.dependencies) : {},
        fileStructure: p.fileStructure ? JSON.parse(p.fileStructure) : [],
      }));
      return res.json({ success: true, data: formatted });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch projects' });
    }
  } else {
    const userProjects = fallbackProjects.filter(p => p.userId === userId);
    const data = userProjects.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      dependencies: p.dependencies ? JSON.parse(p.dependencies) : {},
      fileStructure: p.fileStructure ? JSON.parse(p.fileStructure) : [],
    }));
    return res.json({ success: true, data });
  }
};

// GET /api/projects/:id
export const getProjectById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const project = await prisma.project.findFirst({
        where: { id, userId },
      });
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      return res.json({
        success: true,
        data: {
          ...project,
          dependencies: project.dependencies ? JSON.parse(project.dependencies) : {},
          fileStructure: project.fileStructure ? JSON.parse(project.fileStructure) : [],
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const project = fallbackProjects.find(p => p.id === id && p.userId === userId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    return res.json({
      success: true,
      data: {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        dependencies: project.dependencies ? JSON.parse(project.dependencies) : {},
        fileStructure: project.fileStructure ? JSON.parse(project.fileStructure) : [],
      },
    });
  }
};

// POST /api/projects/upload
export const createProjectFromZip = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description } = req.body;
  const file = req.file;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!file) return res.status(400).json({ success: false, error: 'No ZIP file uploaded' });
  if (!name) return res.status(400).json({ success: false, error: 'Project name is required' });

  const projectId = `proj-${Math.random().toString(36).substring(2, 9)}`;
  const destDir = path.join(process.cwd(), 'uploads', 'projects', projectId);

  try {
    // Create folders
    fs.mkdirSync(destDir, { recursive: true });

    // Extract ZIP
    const zip = new AdmZip(file.path);
    const zipEntries = zip.getEntries();

    // 1. Validation: Safe paths (Zip Slip check) and sizes
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const entryPath = entry.entryName;
      // Prevent Zip Slip
      const resolvedPath = path.resolve(destDir, entryPath);
      if (!resolvedPath.startsWith(destDir)) {
        throw new Error(`Zip slip path traversal detected: ${entryPath}`);
      }
    }

    if (zipEntries.filter(e => !e.isDirectory).length === 0) {
      throw new Error('Project ZIP is empty or has no files.');
    }

    // Extract all files
    zip.extractAllTo(destDir, true);

    // Hoisting logic for GitHub/Wrapper folder structures
    const extractedContents = fs.readdirSync(destDir);
    if (extractedContents.length === 1) {
      const singleItem = extractedContents[0];
      const singleItemPath = path.join(destDir, singleItem);
      const stat = fs.statSync(singleItemPath);
      if (stat.isDirectory()) {
        const subContents = fs.readdirSync(singleItemPath);
        for (const subItem of subContents) {
          fs.renameSync(
            path.join(singleItemPath, subItem),
            path.join(destDir, subItem)
          );
        }
        fs.rmdirSync(singleItemPath);
      }
    }

    // 2. Scan extracted repository codebase
    const scan = await scanRepository(destDir);

    // Save project record
    const dbActive = await isDbConnected();
    const projectData = {
      name,
      description: description || '',
      sourceType: 'zip' as const,
      sourceUrl: null,
      filePath: destDir,
      status: 'Active',
      validationErrors: null,
      fileCount: scan.fileCount,
      totalSize: scan.totalSize,
      detectedLanguage: scan.detectedLanguage,
      detectedFramework: scan.detectedFramework,
      dependencies: JSON.stringify(scan.dependencies),
      detectedDatabase: scan.detectedDatabase,
      apiFramework: scan.apiFramework,
      summary: scan.summary,
      fileStructure: JSON.stringify(scan.fileStructure),
      userId,
    };

    let result;
    if (dbActive) {
      const dbProject = await prisma.project.create({
        data: {
          id: projectId,
          ...projectData,
        },
      });
      result = {
        ...dbProject,
        dependencies: scan.dependencies,
        fileStructure: scan.fileStructure,
      };
    } else {
      const newProj: ProjectFallback = {
        id: projectId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fallbackProjects.unshift(newProj);
      result = {
        ...newProj,
        createdAt: newProj.createdAt.toISOString(),
        updatedAt: newProj.updatedAt.toISOString(),
        dependencies: scan.dependencies,
        fileStructure: scan.fileStructure,
      };
    }

    // Clean up temporary ZIP file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    // Cleanup extraction folder if error occurred
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return res.status(400).json({ success: false, error: error.message || 'Failed to extract and validate ZIP' });
  }
};

// POST /api/projects/github
export const createProjectFromGithub = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description, githubUrl } = req.body;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!name) return res.status(400).json({ success: false, error: 'Project name is required' });
  if (!githubUrl) return res.status(400).json({ success: false, error: 'GitHub repository URL is required' });

  // Parse Owner and Repo from GitHub URL
  const match = githubUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match) {
    return res.status(400).json({ success: false, error: 'Invalid GitHub URL. Must be in the format: https://github.com/owner/repo' });
  }

  const owner = match[1];
  const repo = match[2];
  const projectId = `proj-${Math.random().toString(36).substring(2, 9)}`;
  const destDir = path.join(process.cwd(), 'uploads', 'projects', projectId);
  const tempZipPath = path.join(process.cwd(), 'uploads', 'temp', `${projectId}.zip`);

  try {
    // Ensure directories exist
    fs.mkdirSync(path.dirname(tempZipPath), { recursive: true });
    fs.mkdirSync(destDir, { recursive: true });

    // Download repository zipball from GitHub redirect endpoint
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball`, {
      headers: {
        'User-Agent': 'DevPilot-AI-Project-Uploader',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempZipPath, buffer);

    // Extract ZIP
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const entryPath = entry.entryName;
      const resolvedPath = path.resolve(destDir, entryPath);
      if (!resolvedPath.startsWith(destDir)) {
        throw new Error(`Zip slip path traversal detected: ${entryPath}`);
      }
    }

    if (zipEntries.filter(e => !e.isDirectory).length === 0) {
      throw new Error('Downloaded repository zipball is empty.');
    }

    // Extract
    zip.extractAllTo(destDir, true);

    // Hoisting logic for root folder wrappers
    const extractedContents = fs.readdirSync(destDir);
    if (extractedContents.length === 1) {
      const singleItem = extractedContents[0];
      const singleItemPath = path.join(destDir, singleItem);
      const stat = fs.statSync(singleItemPath);
      if (stat.isDirectory()) {
        const subContents = fs.readdirSync(singleItemPath);
        for (const subItem of subContents) {
          fs.renameSync(
            path.join(singleItemPath, subItem),
            path.join(destDir, subItem)
          );
        }
        fs.rmdirSync(singleItemPath);
      }
    }

    // Run Scanner
    const scan = await scanRepository(destDir);

    // Save project record
    const dbActive = await isDbConnected();
    const projectData = {
      name,
      description: description || '',
      sourceType: 'github' as const,
      sourceUrl: githubUrl,
      filePath: destDir,
      status: 'Active',
      validationErrors: null,
      fileCount: scan.fileCount,
      totalSize: scan.totalSize,
      detectedLanguage: scan.detectedLanguage,
      detectedFramework: scan.detectedFramework,
      dependencies: JSON.stringify(scan.dependencies),
      detectedDatabase: scan.detectedDatabase,
      apiFramework: scan.apiFramework,
      summary: scan.summary,
      fileStructure: JSON.stringify(scan.fileStructure),
      userId,
    };

    let result;
    if (dbActive) {
      const dbProject = await prisma.project.create({
        data: {
          id: projectId,
          ...projectData,
        },
      });
      result = {
        ...dbProject,
        dependencies: scan.dependencies,
        fileStructure: scan.fileStructure,
      };
    } else {
      const newProj: ProjectFallback = {
        id: projectId,
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fallbackProjects.unshift(newProj);
      result = {
        ...newProj,
        createdAt: newProj.createdAt.toISOString(),
        updatedAt: newProj.updatedAt.toISOString(),
        dependencies: scan.dependencies,
        fileStructure: scan.fileStructure,
      };
    }

    // Cleanup temp zip
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    return res.status(400).json({ success: false, error: error.message || 'Failed to download and extract GitHub repository' });
  }
};

// POST /api/projects/:id/scan (Trigger manual rescan)
export const scanProjectAction = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  try {
    let projectPath: string | null = null;
    let name = '';
    let description = '';
    let sourceType: 'zip' | 'github' = 'zip';
    let sourceUrl: string | null = null;

    if (dbActive) {
      const project = await prisma.project.findFirst({ where: { id, userId } });
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      projectPath = project.filePath;
      name = project.name;
      description = project.description || '';
      sourceType = project.sourceType as 'zip' | 'github';
      sourceUrl = project.sourceUrl;
    } else {
      const project = fallbackProjects.find(p => p.id === id && p.userId === userId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      projectPath = project.filePath || null;
      name = project.name;
      description = project.description || '';
      sourceType = project.sourceType as 'zip' | 'github';
      sourceUrl = project.sourceUrl || null;
    }

    if (!projectPath || !fs.existsSync(projectPath)) {
      return res.status(400).json({ success: false, error: 'Project files do not exist on the server disk.' });
    }

    // Run Repository Scanner
    const scan = await scanRepository(projectPath);

    const updateData = {
      fileCount: scan.fileCount,
      totalSize: scan.totalSize,
      detectedLanguage: scan.detectedLanguage,
      detectedFramework: scan.detectedFramework,
      dependencies: JSON.stringify(scan.dependencies),
      detectedDatabase: scan.detectedDatabase,
      apiFramework: scan.apiFramework,
      summary: scan.summary,
      fileStructure: JSON.stringify(scan.fileStructure),
      updatedAt: new Date(),
    };

    let result;
    if (dbActive) {
      const dbProject = await prisma.project.update({
        where: { id },
        data: updateData,
      });
      result = {
        ...dbProject,
        dependencies: scan.dependencies,
        fileStructure: scan.fileStructure,
      };
    } else {
      const project = fallbackProjects.find(p => p.id === id && p.userId === userId);
      if (project) {
        Object.assign(project, updateData);
        result = {
          ...project,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          dependencies: scan.dependencies,
          fileStructure: scan.fileStructure,
        };
      }
    }

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to scan repository' });
  }
};

// DELETE /api/projects/:id
export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  try {
    let filePath: string | null = null;

    if (dbActive) {
      const project = await prisma.project.findFirst({ where: { id, userId } });
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
      filePath = project.filePath;
      await prisma.project.delete({ where: { id } });
    } else {
      const idx = fallbackProjects.findIndex(p => p.id === id && p.userId === userId);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Project not found' });
      filePath = fallbackProjects[idx].filePath || null;
      fallbackProjects.splice(idx, 1);
    }

    // Delete extracted files from disk
    if (filePath && fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true });
    }

    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
