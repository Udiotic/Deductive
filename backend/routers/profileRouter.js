// routers/profileRouter.js
import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import { authenticateToken } from '../controllers/authController.js';

const router = Router();

router.get('/', authenticateToken, getProfile);
router.patch('/', authenticateToken, updateProfile);

export default router;
