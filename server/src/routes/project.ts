import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../middleware/auth.js';
import {
  getProjects,
  getProjectById,
  createProjectFromZip,
  createProjectFromGithub,
  scanProjectAction,
  deleteProject,
} from '../controllers/project.js';

const router = Router();

// Configure multer temp directory
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  dest: tempDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Protect all project routes
router.use(authenticateJWT);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/upload', upload.single('file'), createProjectFromZip);
router.post('/github', createProjectFromGithub);
router.post('/:id/scan', scanProjectAction);
router.delete('/:id', deleteProject);

export default router;
