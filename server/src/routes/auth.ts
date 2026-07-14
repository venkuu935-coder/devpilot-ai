import { Router } from 'express';
import { login, register, getProfile, forgotPassword, resetPassword, logout, verifyEmail, verify2FA, googleLogin } from '../controllers/auth.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/verify-2fa', verify2FA);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authenticateJWT, logout);
router.get('/profile', authenticateJWT, getProfile);

export default router;
