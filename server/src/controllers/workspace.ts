import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { WorkspaceRole } from '@devpilot/shared';
import {
  fallbackWorkspaces,
  fallbackWorkspaceMembers,
  fallbackUsers,
  WorkspaceFallback,
  WorkspaceMemberFallback,
} from '../utils/fallbackAuthDb.js';

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

// GET /api/workspaces
export const getWorkspaces = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, data: workspaces });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch workspaces' });
    }
  } else {
    // Fallback Mock store
    const userMemberLinks = fallbackWorkspaceMembers.filter((m) => m.userId === userId);
    const workspaceIds = userMemberLinks.map((m) => m.workspaceId);
    const workspaces = fallbackWorkspaces.filter((w) => workspaceIds.includes(w.id));

    // Embed mock members
    const data = workspaces.map((w) => {
      const members = fallbackWorkspaceMembers
        .filter((m) => m.workspaceId === w.id)
        .map((m) => {
          const user = fallbackUsers.find((u) => u.id === m.userId);
          return {
            ...m,
            joinedAt: m.joinedAt.toISOString(),
            user: user ? { id: user.id, username: user.username, email: user.email } : undefined,
          };
        });

      return {
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        members,
      };
    });

    return res.json({ success: true, data });
  }
};

// POST /api/workspaces
export const createWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description } = req.body;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!name) return res.status(400).json({ success: false, error: 'Workspace name is required' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name,
          description,
          userId,
          members: {
            create: {
              userId,
              role: 'Owner',
            },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, email: true } } },
          },
        },
      });

      return res.status(201).json({ success: true, data: workspace });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to create workspace' });
    }
  } else {
    const newWs: WorkspaceFallback = {
      id: `fallback-ws-${Math.random().toString(36).substring(2, 9)}`,
      name,
      description,
      isArchived: false,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    fallbackWorkspaces.unshift(newWs);

    const newMember: WorkspaceMemberFallback = {
      id: `fallback-member-${Math.random().toString(36).substring(2, 9)}`,
      workspaceId: newWs.id,
      userId,
      role: 'Owner',
      joinedAt: new Date(),
    };
    fallbackWorkspaceMembers.push(newMember);

    const user = fallbackUsers.find((u) => u.id === userId);

    return res.status(201).json({
      success: true,
      data: {
        ...newWs,
        createdAt: newWs.createdAt.toISOString(),
        updatedAt: newWs.updatedAt.toISOString(),
        members: [
          {
            ...newMember,
            joinedAt: newMember.joinedAt.toISOString(),
            user: user ? { id: user.id, username: user.username, email: user.email } : undefined,
          },
        ],
      },
    });
  }
};

// PUT /api/workspaces/:id
export const updateWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      // Must be Owner or Editor
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || (member.role !== 'Owner' && member.role !== 'Editor')) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }

      const updated = await prisma.workspace.update({
        where: { id },
        data: { name, description },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || (member.role !== 'Owner' && member.role !== 'Editor')) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    const ws = fallbackWorkspaces.find((w) => w.id === id);
    if (!ws) return res.status(404).json({ success: false, error: 'Not found' });

    ws.name = name;
    ws.description = description;
    ws.updatedAt = new Date();

    return res.json({ success: true, data: { ...ws, updatedAt: ws.updatedAt.toISOString() } });
  }
};

// DELETE /api/workspaces/:id
export const deleteWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || member.role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Only Owners can delete workspaces' });
      }

      await prisma.workspace.delete({ where: { id } });
      return res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || member.role !== 'Owner') {
      return res.status(403).json({ success: false, error: 'Only Owners can delete workspaces' });
    }

    const wsIdx = fallbackWorkspaces.findIndex((w) => w.id === id);
    if (wsIdx > -1) fallbackWorkspaces.splice(wsIdx, 1);

    return res.json({ success: true, message: 'Deleted' });
  }
};

// PATCH /api/workspaces/:id/archive
export const archiveWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || member.role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Only Owners can archive workspaces' });
      }

      const ws = await prisma.workspace.findUnique({ where: { id } });
      if (!ws) return res.status(404).json({ success: false, error: 'Not found' });

      await prisma.workspace.update({
        where: { id },
        data: { isArchived: !ws.isArchived },
      });

      return res.json({ success: true, message: 'Archived status toggled' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || member.role !== 'Owner') {
      return res.status(403).json({ success: false, error: 'Only Owners can archive workspaces' });
    }

    const ws = fallbackWorkspaces.find((w) => w.id === id);
    if (!ws) return res.status(404).json({ success: false, error: 'Not found' });

    ws.isArchived = !ws.isArchived;
    return res.json({ success: true, message: 'Archived status toggled' });
  }
};

// POST /api/workspaces/:id/members
export const inviteMember = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || member.role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Only Owners can invite members' });
      }

      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

      const newMember = await prisma.workspaceMember.create({
        data: { workspaceId: id, userId: targetUser.id, role: 'Viewer' },
        include: { user: { select: { id: true, username: true, email: true } } },
      });

      return res.json({ success: true, data: newMember });
    } catch (error: any) {
      if (error.code === 'P2002') return res.status(400).json({ success: false, error: 'User is already a member' });
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || member.role !== 'Owner') return res.status(403).json({ success: false, error: 'Only Owners can invite members' });

    const targetUser = fallbackUsers.find((u) => u.email === email);
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

    if (fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === targetUser.id)) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    const newMember: WorkspaceMemberFallback = {
      id: `fallback-member-${Math.random().toString(36).substring(2, 9)}`,
      workspaceId: id,
      userId: targetUser.id,
      role: 'Viewer',
      joinedAt: new Date(),
    };
    fallbackWorkspaceMembers.push(newMember);

    return res.json({
      success: true,
      data: {
        ...newMember,
        joinedAt: newMember.joinedAt.toISOString(),
        user: { id: targetUser.id, username: targetUser.username, email: targetUser.email },
      },
    });
  }
};

// PUT /api/workspaces/:id/members/:targetUserId
export const updateMemberRole = async (req: AuthenticatedRequest, res: Response) => {
  const { id, targetUserId } = req.params;
  const { role } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (role !== 'Owner' && role !== 'Editor' && role !== 'Viewer') {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || member.role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Only Owners can update roles' });
      }

      const updated = await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: id, userId: targetUserId } },
        data: { role },
      });

      return res.json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || member.role !== 'Owner') return res.status(403).json({ success: false, error: 'Only Owners can update roles' });

    const target = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === targetUserId);
    if (!target) return res.status(404).json({ success: false, error: 'Member not found' });

    target.role = role as WorkspaceRole;
    return res.json({ success: true, data: target });
  }
};

// DELETE /api/workspaces/:id/members/:targetUserId
export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
  const { id, targetUserId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId } },
      });

      if (!member || member.role !== 'Owner') {
        return res.status(403).json({ success: false, error: 'Only Owners can remove members' });
      }

      await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId: id, userId: targetUserId } },
      });

      return res.json({ success: true, message: 'Member removed' });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const member = fallbackWorkspaceMembers.find((m) => m.workspaceId === id && m.userId === userId);
    if (!member || member.role !== 'Owner') return res.status(403).json({ success: false, error: 'Only Owners can remove members' });

    const idx = fallbackWorkspaceMembers.findIndex((m) => m.workspaceId === id && m.userId === targetUserId);
    if (idx > -1) fallbackWorkspaceMembers.splice(idx, 1);

    return res.json({ success: true, message: 'Member removed' });
  }
};
