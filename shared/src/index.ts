export type UserRole = 'Admin' | 'Developer';

export interface UserDTO {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface JWTPayload {
  id: string;
  username: string;
  role: UserRole;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type WorkspaceRole = 'Owner' | 'Editor' | 'Viewer';

export interface WorkspaceMemberDTO {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: Pick<UserDTO, 'id' | 'username' | 'email'>;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  userId: string;
  members?: WorkspaceMemberDTO[];
}

export type ProjectStatus = 'Uploaded' | 'Validating' | 'Active' | 'Failed';

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string;
  sourceType: 'zip' | 'github';
  sourceUrl?: string;
  status: ProjectStatus;
  validationErrors?: string;
  fileCount: number;
  totalSize: number;
  detectedLanguage?: string;
  detectedFramework?: string;
  dependencies?: Record<string, string>;
  detectedDatabase?: string;
  apiFramework?: string;
  summary?: string;
  fileStructure?: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

