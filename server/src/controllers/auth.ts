import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isValidEmail, isValidPassword } from '../utils/validation.js';
import {
  fallbackUsers,
  fallbackSessions,
  UserFallback,
  SessionFallback
} from '../utils/fallbackAuthDb.js';
import { UserRole } from '@devpilot/shared';

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

export const register = async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, error: 'Username, email and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  const selectedRole: UserRole = role === 'Admin' ? 'Admin' : 'Developer';
  const hashedPassword = await bcrypt.hash(password, 10);

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
      });

      if (existingUser) {
        return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
      }

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: selectedRole
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Database registration failed' });
    }
  } else {
    // Fallback Mock store
    const existing = fallbackUsers.find((u) => u.email === email || u.username === username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    const fallbackUser: UserFallback = {
      id: `fallback-user-${Math.random().toString(36).substring(2, 9)}`,
      username,
      email,
      passwordHash: hashedPassword,
      role: selectedRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    fallbackUsers.push(fallbackUser);

    return res.status(201).json({
      success: true,
      message: 'Registered successfully (mock fallback database)',
      data: {
        id: fallbackUser.id,
        username: fallbackUser.username,
        email: fallbackUser.email,
        role: fallbackUser.role,
        createdAt: fallbackUser.createdAt.toISOString()
      }
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role as UserRole },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      // Create session row
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt
        }
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          }
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Login failed' });
    }
  } else {
    // Fallback Mock store
    const user = fallbackUsers.find((u) => u.email === email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    fallbackSessions.push({
      id: `fallback-session-${Math.random().toString(36).substring(2, 9)}`,
      token,
      userId: user.id,
      expiresAt,
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: 'Login successful (mock fallback database)',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString()
        }
      }
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'A valid email address is required' });
  }

  const token = crypto.randomBytes(20).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour expiration

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'No user registered with this email address' });
      }

      await prisma.user.update({
        where: { email },
        data: {
          resetToken: token,
          resetTokenExpires: expires
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Database transaction failed' });
    }
  } else {
    // Fallback Mock store
    const userIdx = fallbackUsers.findIndex((u) => u.email === email);
    if (userIdx === -1) {
      return res.status(404).json({ success: false, error: 'No user registered with this email address' });
    }

    fallbackUsers[userIdx].resetToken = token;
    fallbackUsers[userIdx].resetTokenExpires = expires;
  }

  // Simulate sending email by printing reset link to the server console
  console.log('\n==================================================');
  console.log(`[DevPilot Simulation] PASSWORD RESET LINK:`);
  console.log(`http://localhost:5173/reset-password?token=${token}`);
  console.log('==================================================\n');

  return res.json({
    success: true,
    message: 'Reset token compiled successfully. Copy the link from the server terminal console to reset your password.'
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, error: 'Token and new password are required' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Reset token is invalid or has expired' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpires: null
        }
      });

      return res.json({ success: true, message: 'Password reset successful' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Database password update failed' });
    }
  } else {
    // Fallback Mock store
    const userIdx = fallbackUsers.findIndex(
      (u) =>
        u.resetToken === token &&
        u.resetTokenExpires &&
        u.resetTokenExpires.getTime() > Date.now()
    );

    if (userIdx === -1) {
      return res.status(400).json({ success: false, error: 'Reset token is invalid or has expired' });
    }

    fallbackUsers[userIdx].passwordHash = hashedPassword;
    fallbackUsers[userIdx].resetToken = null;
    fallbackUsers[userIdx].resetTokenExpires = null;

    return res.json({ success: true, message: 'Password reset successful (mock fallback database)' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session missing' });
  }

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Profile fetch failed' });
    }
  } else {
    // Fallback Mock store
    const user = fallbackUsers.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      }
    });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required for log out' });
  }

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      await prisma.session.deleteMany({ where: { token } });
      return res.json({ success: true, message: 'Session deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Logout failed' });
    }
  } else {
    // Fallback Mock store
    const sessionIdx = fallbackSessions.findIndex((s) => s.token === token);
    if (sessionIdx !== -1) {
      fallbackSessions.splice(sessionIdx, 1);
    }
    return res.json({ success: true, message: 'Session deleted successfully (mock fallback database)' });
  }
};
