import { Request, Response } from 'express';
import POI from '../models/POI';
import PendingModification from '../models/PendingModification';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

// GET /api/pois - Get all POIs with filters
export const getAllPOIs = async (req: Request, res: Response) => {
  try {
    const { category, massif, search, status = 'approved' } = req.query;

    // Build filter
    const filter: any = { status };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (massif && massif !== 'all') {
      filter.massif = massif;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pois = await POI.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Transform _id to id for frontend compatibility
    const transformedPois = pois.map(poi => ({
      ...poi,
      id: poi._id.toString(),
    }));

    res.json({
      success: true,
      count: transformedPois.length,
      data: transformedPois,
    });
  } catch (error: any) {
    console.error('Error fetching POIs:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des POIs',
      details: error.message,
    });
  }
};

// GET /api/pois/:id - Get single POI
export const getPOIById = async (req: Request, res: Response) => {
  try {
    const poi = await POI.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('comments.userId', 'name')
      .lean();

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'POI non trouvé',
      });
    }

    // Transform _id to id for frontend compatibility
    const transformedPoi = {
      ...poi,
      id: poi._id.toString(),
    };

    res.json({
      success: true,
      data: transformedPoi,
    });
  } catch (error: any) {
    console.error('Error fetching POI:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du POI',
    });
  }
};

// POST /api/pois - Create new POI (requires auth, goes to moderation)
export const createPOI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const poiData = {
      ...req.body,
      createdBy: req.userId,
      status: 'pending', // Needs approval
    };

    // Create pending modification instead of direct POI
    const pendingMod = await PendingModification.create({
      type: 'new_poi',
      userId: req.userId,
      data: poiData,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Votre proposition a été soumise et sera validée par un administrateur',
      data: pendingMod,
    });
  } catch (error: any) {
    console.error('Error creating POI:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du POI',
    });
  }
};

// POST /api/pois/:id/like - Toggle like
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const poi = await POI.findById(req.params.id);

    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'POI non trouvé',
      });
    }

    const userIdStr = req.userId.toString();
    const likedIndex = poi.likedBy.findIndex(id => id.toString() === userIdStr);

    if (likedIndex > -1) {
      // Unlike
      poi.likedBy.splice(likedIndex, 1);
      poi.likes = Math.max(0, poi.likes - 1);
    } else {
      // Like
      poi.likedBy.push(req.userId as any);
      poi.likes += 1;
    }

    await poi.save();

    res.json({
      success: true,
      data: {
        likes: poi.likes,
        isLiked: likedIndex === -1,
      },
    });
  } catch (error: any) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du like',
    });
  }
};

// POST /api/pois/:id/bookmark - Toggle bookmark
export const toggleBookmark = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    const poi = await POI.findById(req.params.id);
    if (!poi) {
      return res.status(404).json({
        success: false,
        error: 'POI non trouvé',
      });
    }

    const poiIdStr = req.params.id;
    const bookmarkIndex = user.bookmarks.findIndex(id => id.toString() === poiIdStr);

    if (bookmarkIndex > -1) {
      // Remove bookmark
      user.bookmarks.splice(bookmarkIndex, 1);
    } else {
      // Add bookmark
      user.bookmarks.push(poi._id as any);
    }

    await user.save();

    res.json({
      success: true,
      data: {
        isBookmarked: bookmarkIndex === -1,
        bookmarksCount: user.bookmarks.length,
      },
    });
  } catch (error: any) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du bookmark',
    });
  }
};

// POST /api/pois/:id/comments - Add comment (goes to moderation)
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le commentaire ne peut pas être vide',
      });
    }

    // Create pending modification
    const pendingMod = await PendingModification.create({
      type: 'comment',
      userId: req.userId,
      poiId: req.params.id,
      data: { text },
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Votre commentaire a été soumis et sera visible après validation',
      data: pendingMod,
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du commentaire',
    });
  }
};

// POST /api/pois/:id/photos - Add photo URL (goes to moderation)
export const addPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const { photoUrl } = req.body;

    if (!photoUrl || photoUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URL de la photo requise',
      });
    }

    // Create pending modification
    const pendingMod = await PendingModification.create({
      type: 'photo',
      userId: req.userId,
      poiId: req.params.id,
      data: { photoUrl },
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Votre photo a été soumise et sera visible après validation',
      data: pendingMod,
    });
  } catch (error: any) {
    console.error('Error adding photo:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la photo',
    });
  }
};

// POST /api/pois/:id/photos/upload - Upload photo file (goes to moderation)
export const uploadPhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni',
      });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'dormir-la-haut',
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'upload de l\'image',
          });
        }

        if (!result) {
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'upload',
          });
        }

        // Create pending modification with Cloudinary URL
        const pendingMod = await PendingModification.create({
          type: 'photo',
          userId: req.userId,
          poiId: req.params.id,
          data: { photoUrl: result.secure_url },
          status: 'pending',
        });

        res.status(201).json({
          success: true,
          message: 'Votre photo a été uploadée et sera visible après validation',
          data: pendingMod,
        });
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = Readable.from(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de la photo',
    });
  }
};

// PATCH /api/pois/:id/edit - Suggest POI edits (goes to moderation)
export const suggestEdit = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const { changes } = req.body;

    if (!changes || Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune modification fournie',
      });
    }

    // Validate changes
    const allowedFields = ['name', 'altitude', 'sunExposition', 'description'];
    const invalidFields = Object.keys(changes).filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Champs non autorisés: ${invalidFields.join(', ')}`,
      });
    }

    // Validate sunExposition if provided
    if (changes.sunExposition) {
      const validExpositions = ['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'];
      if (!validExpositions.includes(changes.sunExposition)) {
        return res.status(400).json({
          success: false,
          error: 'Exposition invalide',
        });
      }
    }

    // Validate altitude if provided
    if (changes.altitude !== undefined) {
      const altitude = parseInt(changes.altitude);
      if (isNaN(altitude) || altitude < 0 || altitude > 9000) {
        return res.status(400).json({
          success: false,
          error: 'Altitude invalide (0-9000m)',
        });
      }
      changes.altitude = altitude;
    }

    // Create pending modification
    const pendingMod = await PendingModification.create({
      type: 'edit_poi',
      userId: req.userId,
      poiId: req.params.id,
      data: changes,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Vos modifications ont été soumises et seront validées par un administrateur',
      data: pendingMod,
    });
  } catch (error: any) {
    console.error('Error suggesting edit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la proposition de modification',
    });
  }
};

// PATCH /api/pois/:id/exposition - Suggest exposition (legacy, redirects to suggestEdit)
export const suggestExposition = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const { sunExposition } = req.body;

    const validExpositions = ['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'];
    
    if (!sunExposition || !validExpositions.includes(sunExposition)) {
      return res.status(400).json({
        success: false,
        error: 'Exposition invalide',
      });
    }

    // Create pending modification
    const pendingMod = await PendingModification.create({
      type: 'edit_poi',
      userId: req.userId,
      poiId: req.params.id,
      data: { sunExposition },
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Votre proposition d\'exposition a été soumise et sera validée par un administrateur',
      data: pendingMod,
    });
  } catch (error: any) {
    console.error('Error suggesting exposition:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la proposition d\'exposition',
    });
  }
};

// GET /api/pois/user/bookmarks - Get user's bookmarks
export const getUserBookmarks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    const user = await User.findById(req.userId).populate('bookmarks');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé',
      });
    }

    res.json({
      success: true,
      data: user.bookmarks,
    });
  } catch (error: any) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des bookmarks',
    });
  }
};

// GET /api/pois/stats - Get statistics
export const getStats = async (req: Request, res: Response) => {
  try {
    const totalPOIs = await POI.countDocuments({ status: 'approved' });
    
    const byCategory = await POI.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const byMassif = await POI.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$massif', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: totalPOIs,
        byCategory,
        byMassif,
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
