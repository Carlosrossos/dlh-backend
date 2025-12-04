import { Router } from 'express';
import { signup, signin, getMe, updateProfile, uploadAvatar, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { signupValidation, signinValidation, validate } from '../middleware/validation';
import { upload } from '../middleware/upload';

const router = Router();

// Apply strict rate limiting to auth routes (protection against brute-force)
router.post('/signup', authLimiter, signupValidation, validate, signup);
router.post('/signin', authLimiter, signinValidation, validate, signin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.get('/me', authenticateToken, getMe);
router.patch('/profile', authenticateToken, updateProfile);
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);

export default router;
