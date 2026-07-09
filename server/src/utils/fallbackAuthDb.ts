import bcrypt from 'bcryptjs';
import { UserRole, WorkspaceRole } from '@devpilot/shared';

export interface UserFallback {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionFallback {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WorkspaceFallback {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface WorkspaceMemberFallback {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface ProjectFallback {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  sourceUrl?: string | null;
  filePath?: string | null;
  status: string;
  validationErrors?: string | null;
  fileCount: number;
  totalSize: number;
  detectedLanguage?: string | null;
  detectedFramework?: string | null;
  dependencies?: string | null; // JSON string
  detectedDatabase?: string | null;
  apiFramework?: string | null;
  summary?: string | null;
  fileStructure?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export const fallbackUsers: UserFallback[] = [];
export const fallbackSessions: SessionFallback[] = [];
export const fallbackWorkspaces: WorkspaceFallback[] = [];
export const fallbackWorkspaceMembers: WorkspaceMemberFallback[] = [];
export const fallbackProjects: ProjectFallback[] = [];

// Seed default developer user: password is 'password'
const defaultHash = bcrypt.hashSync('password', 10);
const defaultUserId = 'dev-user-id-123';
fallbackUsers.push({
  id: defaultUserId,
  username: 'developer',
  email: 'dev@devpilot.ai',
  passwordHash: defaultHash,
  role: 'Developer',
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Seed default mock workspace
const defaultWorkspaceId = 'mock-ws-1';
fallbackWorkspaces.push({
  id: defaultWorkspaceId,
  name: 'DevPilot Landing Page',
  description: 'An AI generated landing page project.',
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: defaultUserId,
});
fallbackWorkspaceMembers.push({
  id: 'mock-ws-member-1',
  workspaceId: defaultWorkspaceId,
  userId: defaultUserId,
  role: 'Owner',
  joinedAt: new Date(),
});

// Seed default mock projects
fallbackProjects.push({
  id: 'mock-proj-1',
  name: 'DevPilot Landing Page',
  description: 'A beautiful landing page for DevPilot AI.',
  sourceType: 'zip',
  sourceUrl: null,
  filePath: null,
  status: 'Active',
  validationErrors: null,
  fileCount: 15,
  totalSize: 45200,
  detectedLanguage: 'TypeScript',
  detectedFramework: 'React',
  dependencies: JSON.stringify({
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    'framer-motion': '^11.0.0',
    'tailwindcss': '^3.4.1',
    'typescript': '^5.2.2'
  }),
  detectedDatabase: 'None',
  apiFramework: 'None',
  summary: 'This is a TypeScript project built on the React framework. It consists of 15 files totaling 44.14 KB. The project lists 5 package dependencies, including react, react-dom, framer-motion, tailwindcss.',
  fileStructure: JSON.stringify(['package.json', 'src/App.tsx', 'src/index.css', 'src/main.tsx', 'index.html', 'tailwind.config.js']),
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  userId: defaultUserId,
});

fallbackProjects.push({
  id: 'mock-proj-2',
  name: 'E-commerce API',
  description: 'Backend REST API for an e-commerce platform.',
  sourceType: 'github',
  sourceUrl: 'https://github.com/developer/ecommerce-api',
  filePath: null,
  status: 'Active',
  validationErrors: null,
  fileCount: 42,
  totalSize: 184500,
  detectedLanguage: 'JavaScript',
  detectedFramework: 'None',
  dependencies: JSON.stringify({
    'express': '^4.18.2',
    'mongoose': '^8.0.1',
    'jsonwebtoken': '^9.0.2',
    'bcryptjs': '^2.4.3',
    'dotenv': '^16.3.1'
  }),
  detectedDatabase: 'MongoDB (Mongoose)',
  apiFramework: 'Express',
  summary: 'This is a JavaScript project using Express for its API layer integrating a MongoDB (Mongoose) database. It consists of 42 files totaling 180.18 KB. The project lists 5 package dependencies, including express, mongoose, jsonwebtoken, bcryptjs.',
  fileStructure: JSON.stringify(['package.json', 'src/index.js', 'src/controllers/product.js', 'src/models/Product.js', 'src/routes/api.js', '.env.example']),
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  userId: defaultUserId,
});
