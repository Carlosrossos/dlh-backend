import { Request, Response } from 'express';
import PendingModification from '../models/PendingModification';
import POI from '../models/POI';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// GET /api/admin/user/contributions - Get user's contributions
export const getUserContributions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const contributions = await PendingModification.find({ userId: req.userId })
      .populate('poiId', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: contributions.length,
      data: contributions,
    });
  } catch (error: any) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contributions',
    });
  }
};

// GET /api/admin/pending - Get all pending modifications
export const getPendingModifications = async (req: Request, res: Response) => {
  try {
    const { type, status = 'pending' } = req.query;

    const filter: any = { status };
    if (type) {
      filter.type = type;
    }

    const modifications = await PendingModification.find(filter)
      .populate('userId', 'name email')
      .populate('poiId', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: modifications.length,
      data: modifications,
    });
  } catch (error: any) {
    console.error('Error fetching pending modifications:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des modifications',
    });
  }
};

// POST /api/admin/pending/:id/approve - Approve a modification
export const approveModification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { selectedFields } = req.body; // Array of field names to approve
    const adminId = req.userId;

    const modification = await PendingModification.findById(id);
    if (!modification) {
      return res.status(404).json({
        success: false,
        error: 'Modification non trouvée',
      });
    }

    if (modification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cette modification a déjà été traitée',
      });
    }

    // Apply modification based on type
    switch (modification.type) {
      case 'new_poi':
        // Create new POI
        const newPOI = await POI.create({
          ...modification.data,
          status: 'approved',
        });
        console.log(`✅ Nouveau POI approuvé: ${newPOI.name}`);
        break;

      case 'comment':
        // Add comment to POI
        const poiForComment = await POI.findById(modification.poiId);
        if (poiForComment) {
          poiForComment.comments.push({
            id: Date.now().toString(),
            author: modification.data.author || 'Utilisateur',
            userId: modification.userId,
            text: modification.data.text,
            date: new Date(),
          } as any);
          await poiForComment.save();
          console.log(`✅ Commentaire approuvé pour: ${poiForComment.name}`);
        }
        break;

      case 'photo':
        // Add photo to POI
        const poiForPhoto = await POI.findById(modification.poiId);
        if (poiForPhoto) {
          poiForPhoto.photos.push(modification.data.photoUrl);
          await poiForPhoto.save();
          console.log(`✅ Photo approuvée pour: ${poiForPhoto.name}`);
        }
        break;

      case 'edit_poi':
        // Update POI fields - only selected ones if provided
        const poiToEdit = await POI.findById(modification.poiId);
        if (poiToEdit) {
          let dataToApply = modification.data;
          
          // If selectedFields is provided, filter the data
          if (selectedFields && Array.isArray(selectedFields) && selectedFields.length > 0) {
            dataToApply = {};
            selectedFields.forEach((field: string) => {
              if (modification.data[field] !== undefined) {
                dataToApply[field] = modification.data[field];
              }
            });
            console.log(`✅ Approbation sélective: ${selectedFields.join(', ')}`);
          }
          
          Object.assign(poiToEdit, dataToApply);
          await poiToEdit.save();
          console.log(`✅ Modification approuvée pour: ${poiToEdit.name}`);
        }
        break;
    }

    // Mark modification as approved
    modification.status = 'approved';
    modification.reviewedBy = adminId as any;
    modification.reviewedAt = new Date();
    await modification.save();

    res.json({
      success: true,
      message: 'Modification approuvée avec succès',
      data: modification,
    });
  } catch (error: any) {
    console.error('Error approving modification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'approbation',
    });
  }
};

// POST /api/admin/pending/:id/reject - Reject a modification
export const rejectModification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.userId;

    const modification = await PendingModification.findById(id);
    if (!modification) {
      return res.status(404).json({
        success: false,
        error: 'Modification non trouvée',
      });
    }

    if (modification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cette modification a déjà été traitée',
      });
    }

    // Mark as rejected
    modification.status = 'rejected';
    modification.reviewedBy = adminId as any;
    modification.reviewedAt = new Date();
    modification.rejectionReason = reason || 'Non conforme';
    await modification.save();

    console.log(`❌ Modification rejetée: ${modification.type}`);

    res.json({
      success: true,
      message: 'Modification rejetée',
      data: modification,
    });
  } catch (error: any) {
    console.error('Error rejecting modification:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du rejet',
    });
  }
};

// GET /api/admin/stats - Get moderation statistics
export const getModerationStats = async (req: Request, res: Response) => {
  try {
    const pending = await PendingModification.countDocuments({ status: 'pending' });
    const approved = await PendingModification.countDocuments({ status: 'approved' });
    const rejected = await PendingModification.countDocuments({ status: 'rejected' });

    const byType = await PendingModification.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
        byType,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
};

// DELETE /api/admin/pois/:poiId/comments/:commentId - Delete a comment from a POI
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    // Verify admin
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs',
      });
    }

    const { poiId, commentId } = req.params;

    // Find the POI
    const poi = await POI.findById(poiId);
    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'POI non trouvé',
      });
    }

    // Find and remove the comment
    const commentIndex = poi.comments.findIndex(
      (c: any) => c.id === commentId || c._id?.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Commentaire non trouvé',
      });
    }

    const deletedComment = poi.comments[commentIndex];
    poi.comments.splice(commentIndex, 1);
    await poi.save();

    console.log(`🗑️ Commentaire supprimé par admin: "${deletedComment.text}" du POI: ${poi.name}`);

    res.json({
      success: true,
      message: 'Commentaire supprimé avec succès',
      data: { deletedComment },
    });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du commentaire',
    });
  }
};
