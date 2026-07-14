import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole, WorkspaceRole } from '@devpilot/shared';

export interface UserFallback {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  resetToken?: string | null;
  resetTokenExpires?: Date | null;
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  twoFactorCode?: string | null;
  twoFactorExpires?: Date | null;
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

// Mock store initializes empty for clean production usage. Users create accounts via registration.
