import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Auth validation rules
export const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Le mot de passe doit contenir entre 6 et 100 caractères')
    .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/)
    .withMessage('Le mot de passe contient des caractères non autorisés'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères')
    .escape(),
];

export const signinValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
];

// POI validation rules
export const createPOIValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères')
    .escape(),
  body('category')
    .isIn(['Bivouac', 'Cabane', 'Refuge'])
    .withMessage('Catégorie invalide'),
  body('massif')
    .isIn(['Mont Blanc', 'Vanoise', 'Écrins', 'Queyras', 'Mercantour', 'Vercors', 'Chartreuse', 'Bauges', 'Aravis', 'Belledonne'])
    .withMessage('Massif invalide'),
  body('coordinates.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide'),
  body('coordinates.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La description doit contenir entre 10 et 2000 caractères')
    .escape(),
  body('altitude')
    .isInt({ min: 0, max: 9000 })
    .withMessage('Altitude invalide'),
  body('sunExposition')
    .optional()
    .isIn(['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'])
    .withMessage('Exposition invalide'),
];

// Comment validation
export const addCommentValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID POI invalide'),
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Le commentaire doit contenir entre 1 et 1000 caractères')
    .escape(),
];

// Photo validation
export const addPhotoValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID POI invalide'),
  body('photoUrl')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('URL de photo invalide'),
];

// Edit POI validation
export const editPOIValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID POI invalide'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Le nom doit contenir entre 3 et 100 caractères')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La description doit contenir entre 10 et 2000 caractères')
    .escape(),
  body('altitude')
    .optional()
    .isInt({ min: 0, max: 9000 })
    .withMessage('Altitude invalide'),
  body('sunExposition')
    .optional()
    .isIn(['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'])
    .withMessage('Exposition invalide'),
];

// MongoDB ID validation
export const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID invalide'),
];
