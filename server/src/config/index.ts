import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'devpilot_jwt_default_secret_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Simple validation
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set inside environment variables.');
}
