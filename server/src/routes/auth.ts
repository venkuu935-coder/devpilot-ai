import { Router } from 'express';
import { login, register, getProfile, forgotPassword, resetPassword, logout } from '../controllers/auth.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authenticateJWT, logout);
router.get('/profile', authenticateJWT, getProfile);

export default router;
