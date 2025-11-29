import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import POI from '../models/POI';
import PendingModification from '../models/PendingModification';

const router = Router();

// Delete user account
router.delete('/delete-account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Delete all user's pending modifications
    await PendingModification.deleteMany({ userId });

    // Remove user from all POI bookmarks
    await POI.updateMany(
      { bookmarkedBy: userId },
      { $pull: { bookmarkedBy: userId } }
    );

    // Remove user from all POI likes
    await POI.updateMany(
      { likedBy: userId },
      { $pull: { likedBy: userId } }
    );

    // Delete all comments by user
    await POI.updateMany(
      { 'comments.userId': userId },
      { $pull: { comments: { userId } } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
  }
});

export default router;
