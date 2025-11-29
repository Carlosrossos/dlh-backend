import express from 'express';
import {
  getAllPOIs,
  getPOIById,
  createPOI,
  toggleLike,
  toggleBookmark,
  addComment,
  addPhoto,
  uploadPhoto,
  suggestEdit,
  suggestExposition,
  getStats,
  getUserBookmarks,
} from '../controllers/poiController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { createContentLimiter, uploadLimiter } from '../middleware/rateLimiter';
import {
  createPOIValidation,
  addCommentValidation,
  addPhotoValidation,
  editPOIValidation,
  mongoIdValidation,
  validate,
} from '../middleware/validation';

const router = express.Router();

// Public routes
router.get('/', getAllPOIs);
router.get('/stats', getStats);

// Protected routes (require authentication)
router.get('/user/bookmarks', authenticateToken, getUserBookmarks);

// Public route (must be after specific routes)
router.get('/:id', mongoIdValidation, validate, getPOIById);
router.post('/', authenticateToken, createContentLimiter, createPOIValidation, validate, createPOI);
router.post('/:id/like', authenticateToken, mongoIdValidation, validate, toggleLike);
router.post('/:id/bookmark', authenticateToken, mongoIdValidation, validate, toggleBookmark);
router.post('/:id/comments', authenticateToken, createContentLimiter, addCommentValidation, validate, addComment);
router.post('/:id/photos', authenticateToken, createContentLimiter, addPhotoValidation, validate, addPhoto); // URL
router.post('/:id/photos/upload', authenticateToken, uploadLimiter, mongoIdValidation, validate, upload.single('photo'), uploadPhoto); // File upload
router.patch('/:id/edit', authenticateToken, createContentLimiter, editPOIValidation, validate, suggestEdit);
router.patch('/:id/exposition', authenticateToken, createContentLimiter, mongoIdValidation, validate, suggestExposition); // Legacy

export default router;
