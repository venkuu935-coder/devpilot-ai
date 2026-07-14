import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isValidEmail, isValidPassword } from '../utils/validation.js';
import {
  fallbackUsers,
  fallbackSessions,
  fallbackWorkspaces,
  fallbackWorkspaceMembers,
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

async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `http://localhost:5173/verify-email?token=${token}`;
  
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;

  console.log('\n==================================================');
  console.log(`[DevPilot Simulation] EMAIL VERIFICATION LINK FOR ${email}:`);
  console.log(verifyLink);
  console.log('==================================================\n');

  if (!user || !pass || pass === 'your-app-password-here') {
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    
    await transporter.sendMail({
      from: `"DevPilot Safety" <${user}>`,
      to: email,
      subject: '[DevPilot] Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #818cf8;">Verify Your Email</h2>
          <p>Please click the button below to verify your email address and activate your account:</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">Verify Account</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #818cf8;">${verifyLink}</p>
        </div>
      `,
    });
  } catch (err: any) {
    console.error('Failed to send verification email:', err.message);
  }
}

async function send2FAEmail(email: string, code: string) {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;

  console.log('\n==================================================');
  console.log(`[DevPilot Simulation] 2FA ONE-TIME CODE FOR ${email}:`);
  console.log(code);
  console.log('==================================================\n');

  if (!user || !pass || pass === 'your-app-password-here') {
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    
    await transporter.sendMail({
      from: `"DevPilot Safety" <${user}>`,
      to: email,
      subject: '[DevPilot] 2-Step Authentication Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #818cf8;">Security Verification Code</h2>
          <p>You are attempting to log in to DevPilot. Please enter the following 2-step verification code:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #818cf8; background: #1e293b; padding: 12px; border-radius: 8px; text-align: center; margin: 24px 0;">${code}</div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err: any) {
    console.error('Failed to send 2FA email:', err.message);
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

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

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
          role: selectedRole,
          isVerified: false,
          verificationToken,
          verificationTokenExpires
        }
      });

      // Automatically create a default workspace for this new user
      await prisma.workspace.create({
        data: {
          name: `${username}'s Workspace`,
          description: 'Default personal workspace.',
          userId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'Owner'
            }
          }
        }
      });

      await sendVerificationEmail(email, verificationToken);

      return res.status(201).json({
        success: true,
        message: 'Registration successful! A verification email has been sent. Please check your inbox.',
        verificationLink: `http://localhost:5173/verify-email?token=${verificationToken}`,
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
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    fallbackUsers.push(fallbackUser);

    // Automatically create fallback workspace and member records
    const newWsId = `fallback-ws-${Math.random().toString(36).substring(2, 9)}`;
    fallbackWorkspaces.push({
      id: newWsId,
      name: `${username}'s Workspace`,
      description: 'Default personal workspace.',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: fallbackUser.id,
    });
    fallbackWorkspaceMembers.push({
      id: `fallback-member-${Math.random().toString(36).substring(2, 9)}`,
      workspaceId: newWsId,
      userId: fallbackUser.id,
      role: 'Owner',
      joinedAt: new Date(),
    });

    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({
      success: true,
      message: 'Registered successfully (mock fallback database). Please check console for verification link.',
      verificationLink: `http://localhost:5173/verify-email?token=${verificationToken}`,
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

const isMailConfigured = () => {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;
  return !!(user && pass && pass !== 'your-app-password-here');
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
        return res.status(400).json({ success: false, error: 'Invalid email' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Incorrect password' });
      }

      if (!user.isVerified) {
        return res.status(400).json({ success: false, error: 'Email address not verified yet. Please check your inbox.' });
      }

      // Generate 2FA One-Time Passcode
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode, twoFactorExpires }
      });

      await send2FAEmail(email, twoFactorCode);

      const tempToken = jwt.sign(
        { id: user.id, isTemp2FA: true },
        config.jwtSecret,
        { expiresIn: '10m' }
      );

      const mailOk = isMailConfigured();

      return res.json({
        success: true,
        require2FA: true,
        tempToken,
        otpCode: mailOk ? undefined : twoFactorCode,
        message: 'A 2-step verification code has been sent to your email.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Login failed' });
    }
  } else {
    // Fallback Mock store
    const user = fallbackUsers.find((u) => u.email === email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Incorrect password' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ success: false, error: 'Email address not verified yet. Please check your inbox.' });
    }

    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const userIdx = fallbackUsers.indexOf(user);
    fallbackUsers[userIdx].twoFactorCode = twoFactorCode;
    fallbackUsers[userIdx].twoFactorExpires = twoFactorExpires;

    await send2FAEmail(email, twoFactorCode);

    const tempToken = jwt.sign(
      { id: user.id, isTemp2FA: true },
      config.jwtSecret,
      { expiresIn: '10m' }
    );

    const mailOk = isMailConfigured();

    return res.json({
      success: true,
      require2FA: true,
      tempToken,
      otpCode: mailOk ? undefined : twoFactorCode,
      message: 'A 2-step verification code has been sent to your email (mock fallback).'
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

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Verification token is required' });
  }

  const dbActive = await isDbConnected();

  if (dbActive) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpires: null
        }
      });

      return res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Database email verification failed' });
    }
  } else {
    const userIdx = fallbackUsers.findIndex(
      (u) =>
        u.verificationToken === token &&
        u.verificationTokenExpires &&
        u.verificationTokenExpires.getTime() > Date.now()
    );

    if (userIdx === -1) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    fallbackUsers[userIdx].isVerified = true;
    fallbackUsers[userIdx].verificationToken = null;
    fallbackUsers[userIdx].verificationTokenExpires = null;

    return res.json({ success: true, message: 'Email verified successfully (mock fallback database)!' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  const { tempToken, code } = req.body;

  if (!tempToken || !code) {
    return res.status(400).json({ success: false, error: 'Temp token and verification code are required' });
  }

  try {
    const decoded = jwt.verify(tempToken, config.jwtSecret) as { id: string; isTemp2FA?: boolean };
    if (!decoded.isTemp2FA) {
      return res.status(400).json({ success: false, error: 'Invalid temporary token format' });
    }

    const dbActive = await isDbConnected();

    if (dbActive) {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (user.twoFactorCode !== code || !user.twoFactorExpires || user.twoFactorExpires < new Date()) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      }

      // Clear code
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode: null, twoFactorExpires: null }
      });

      // Generate real session token
      const sessionToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role as UserRole },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.session.create({
        data: {
          token: sessionToken,
          userId: user.id,
          expiresAt
        }
      });

      return res.json({
        success: true,
        data: {
          token: sessionToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          }
        }
      });
    } else {
      const user = fallbackUsers.find((u) => u.id === decoded.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (user.twoFactorCode !== code || !user.twoFactorExpires || user.twoFactorExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      }

      // Clear code
      const userIdx = fallbackUsers.indexOf(user);
      fallbackUsers[userIdx].twoFactorCode = null;
      fallbackUsers[userIdx].twoFactorExpires = null;

      const sessionToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      fallbackSessions.push({
        id: `fallback-session-${Math.random().toString(36).substring(2, 9)}`,
        token: sessionToken,
        userId: user.id,
        expiresAt,
        createdAt: new Date()
      });

      return res.json({
        success: true,
        data: {
          token: sessionToken,
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
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Invalid or expired token session' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.status(400).json({ success: false, error: 'Email and username are required' });
  }

  const dbActive = await isDbConnected();

  const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
  const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (dbActive) {
    try {
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Register user automatically
        const randomPass = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPass, 10);
        user = await prisma.user.create({
          data: {
            username,
            email,
            password: hashedPassword,
            role: 'Developer',
            isVerified: true
          }
        });

        // Create default workspace
        await prisma.workspace.create({
          data: {
            name: `${username}'s Workspace`,
            description: 'Default personal workspace.',
            userId: user.id,
            members: {
              create: {
                userId: user.id,
                role: 'Owner'
              }
            }
          }
        });
      }

      // Generate 2FA
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode, twoFactorExpires }
      });

      await send2FAEmail(email, twoFactorCode);

      const tempToken = jwt.sign(
        { id: user.id, isTemp2FA: true },
        config.jwtSecret,
        { expiresIn: '10m' }
      );

      const mailOk = isMailConfigured();

      return res.json({
        success: true,
        require2FA: true,
        tempToken,
        otpCode: mailOk ? undefined : twoFactorCode,
        message: 'A 2-step verification code has been sent to your email.'
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Google authentication failed' });
    }
  } else {
    // Fallback Mock store
    let user = fallbackUsers.find((u) => u.email === email);

    if (!user) {
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = bcrypt.hashSync(randomPass, 10);

      user = {
        id: `fallback-user-${Math.random().toString(36).substring(2, 9)}`,
        username,
        email,
        passwordHash: hashedPassword,
        role: 'Developer',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      fallbackUsers.push(user);

      // Create fallback workspace and member records
      const newWsId = `fallback-ws-${Math.random().toString(36).substring(2, 9)}`;
      fallbackWorkspaces.push({
        id: newWsId,
        name: `${username}'s Workspace`,
        description: 'Default personal workspace.',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
      });
      fallbackWorkspaceMembers.push({
        id: `fallback-member-${Math.random().toString(36).substring(2, 9)}`,
        workspaceId: newWsId,
        userId: user.id,
        role: 'Owner',
        joinedAt: new Date(),
      });
    }

    const userIdx = fallbackUsers.indexOf(user);
    fallbackUsers[userIdx].twoFactorCode = twoFactorCode;
    fallbackUsers[userIdx].twoFactorExpires = twoFactorExpires;

    await send2FAEmail(email, twoFactorCode);

    const tempToken = jwt.sign(
      { id: user.id, isTemp2FA: true },
      config.jwtSecret,
      { expiresIn: '10m' }
    );

    const mailOk = isMailConfigured();

    return res.json({
      success: true,
      require2FA: true,
      tempToken,
      otpCode: mailOk ? undefined : twoFactorCode,
      message: 'A 2-step verification code has been sent to your email (mock fallback).'
    });
  }
};
