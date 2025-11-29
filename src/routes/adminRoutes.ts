import express from 'express';
import {
  getPendingModifications,
  approveModification,
  rejectModification,
  getModerationStats,
  deleteComment,
  getUserContributions,
} from '../controllers/moderationController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = express.Router();

// User contributions (requires auth only, not admin)
router.get('/user/contributions', authenticateToken, getUserContributions);

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Moderation routes
router.get('/pending', getPendingModifications);
router.get('/stats', getModerationStats);
router.post('/pending/:id/approve', approveModification);
router.post('/pending/:id/reject', rejectModification);

// Comment management
router.delete('/pois/:poiId/comments/:commentId', deleteComment);

export default router;
