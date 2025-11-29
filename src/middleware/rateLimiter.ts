import rateLimit from 'express-rate-limit';

// Rate limiter général pour toutes les routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limite de 200 requêtes par fenêtre
  message: { error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter strict pour l'authentification (protection brute-force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite de 10 tentatives par fenêtre
  message: { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour la création de contenu (spam protection)
export const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // Limite de 20 créations par heure
  message: { error: 'Trop de contributions. Veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les uploads de photos
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 30, // Limite de 30 uploads par heure
  message: { error: 'Trop d\'uploads de photos. Veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
