import { Router } from 'express';
import authRoutes from './auth.js';
import projectRoutes from './project.js';
import supportRoutes from './support.js';

const router = Router();

// Version 1 Routes entry point
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/support', supportRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server health status OK' });
});

export default router;
