import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ message: 'Auth required' });
  next();
}

router.get('/', requireAuth, getProfile);
router.patch('/', requireAuth, updateProfile);

export default router;
