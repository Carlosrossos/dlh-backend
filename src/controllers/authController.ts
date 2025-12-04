import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import cloudinary from '../config/cloudinary';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Helper to generate JWT
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    // Create user (password will be hashed by pre-save hook)
    const newUser = await User.create({
      email,
      password,
      name: name || email.split('@')[0],
      role: 'user',
      isVerified: false,
      verificationToken: hashedVerificationToken,
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }) as IUser;
    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      verificationToken,
      newUser.name
    );
    if (!emailSent) {
      console.warn(`Email verification non envoyé à: ${email}`);
    }
    res.status(201).json({
      message: 'Compte créé ! Vérifiez votre email pour activer votre compte.',
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Veuillez vérifier votre email avant de vous connecter.',
        requiresVerification: true,
        email: user.email
      });
    }
    // Verify password using model method
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate token
    const token = generateToken((user._id as string).toString());
    res.json({
      message: 'Signed in successfully',
      token,
      user: {
        id: (user._id as string).toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    // Pour des raisons de sécurité, on retourne toujours un succès
    // même si l'email n'existe pas (évite l'énumération des utilisateurs)
    if (!user) {
      return res.json({ 
        message: 'Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé.' 
      });
    }
    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Hasher le token avant de le stocker (sécurité)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // Sauvegarder le token et son expiration (1 heure)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    // Envoyer l'email
    const emailSent = await sendPasswordResetEmail(email, resetToken, user.name);
    if (!emailSent) {
      // En cas d'échec, nettoyer le token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error(`Failed to send reset email to: ${email}`);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }
    res.json({ 
      message: 'Si un compte existe avec cette adresse, un email de réinitialisation sera envoyé.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    // Hasher le token reçu pour le comparer avec celui en base
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // Trouver l'utilisateur avec ce token et vérifier qu'il n'est pas expiré
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    // Mettre à jour le mot de passe
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ 
      user: {
        id: (user._id as string).toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name, avatar } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères' });
      }
      if (name.trim().length > 50) {
        return res.status(400).json({ error: 'Le nom ne peut pas dépasser 50 caractères' });
      }
      user.name = name.trim();
    }
    // Validate avatar URL if provided
    if (avatar !== undefined) {
      if (avatar && typeof avatar === 'string' && avatar.length > 0) {
        // Basic URL validation
        try {
          new URL(avatar);
          user.avatar = avatar;
        } catch {
          return res.status(400).json({ error: 'URL d\'avatar invalide' });
        }
      } else {
        user.avatar = undefined; // Allow removing avatar
      }
    }
    await user.save({ validateBeforeSave: false });
    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: (user._id as string).toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'dormir-la-haut/avatars',
        resource_type: 'image',
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary avatar upload error:', error);
          return res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
        }
        if (!result) {
          return res.status(500).json({ error: 'Erreur lors de l\'upload' });
        }
        // Update user avatar
        user.avatar = result.secure_url;
        await user.save({ validateBeforeSave: false });
        res.json({
          message: 'Avatar mis à jour avec succès',
          user: {
            id: (user._id as string).toString(),
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
          },
        });
      }
    );
    // Pipe the file buffer to Cloudinary
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token de vérification manquant' });
    }
    // Hash the token to compare with stored one
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // Find user with this verification token
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpires');
    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    // Generate token so user is logged in
    const authToken = generateToken((user._id as string).toString());
    res.json({
      message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
      token: authToken,
      user: {
        id: (user._id as string).toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    const user = await User.findOne({ email });
    // Security: always return success even if user doesn't exist
    if (!user) {
      return res.json({ message: 'Si un compte existe avec cette adresse, un email de vérification sera envoyé.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: 'Ce compte est déjà vérifié' });
    }
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, user.name);
    if (!emailSent) {
      console.error(`Failed to resend verification email to: ${email}`);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }
    res.json({ message: 'Email de vérification renvoyé !' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
