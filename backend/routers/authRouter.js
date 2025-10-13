import { Router } from 'express';
import { 
  signup, 
  login, 
  logout, 
  me, 
  verifyEmailCode, 
  requestPasswordReset, 
  resetPassword, 
  resendVerifyCode,
  authenticateToken 
} from '../controllers/authController.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/verify-email-code', verifyEmailCode);
router.post('/resend-verify-code', resendVerifyCode);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);

export default router;
