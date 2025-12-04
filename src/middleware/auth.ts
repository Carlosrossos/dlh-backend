import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  file?: Express.Multer.File;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token d\'authentification requis',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Votre session a expiré. Veuillez vous reconnecter.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Token invalide. Veuillez vous reconnecter.',
      code: 'TOKEN_INVALID'
    });
  }
};
