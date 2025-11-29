import { Router } from 'express';
import { signup, signin, getMe, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { signupValidation, signinValidation, validate } from '../middleware/validation';

const router = Router();

// Apply strict rate limiting to auth routes (protection against brute-force)
router.post('/signup', authLimiter, signupValidation, validate, signup);
router.post('/signin', authLimiter, signinValidation, validate, signin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.get('/me', authenticateToken, getMe);

export default router;
