import { Router } from 'express';
import { signup, login, logout, me, verifyEmailCode, requestPasswordReset, resetPassword, resendVerifyCode } from '../controllers/authController.js';

const router = Router();

router.post('/signup', signup)

router.post('/verify-email-code', verifyEmailCode);

router.post('/resend-verify-code', resendVerifyCode);

router.post('/login', login)

router.post('/logout', logout)

router.post('/forgot-password', requestPasswordReset)

router.post('/reset-password', resetPassword)

router.get('/me', me)

export default router;