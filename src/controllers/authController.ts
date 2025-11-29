import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize with demo users (for testing)
const initDemoUsers = async () => {
  try {
    const demoExists = await User.findOne({ email: 'demo@example.com' });
    
    if (!demoExists) {
      await User.create([
        {
          email: 'demo@example.com',
          password: 'demo123',
          name: 'Demo User',
          role: 'user',
        },
        {
          email: 'john@example.com',
          password: 'demo123',
          name: 'John Doe',
          role: 'user',
        },
        {
          email: 'admin@example.com',
          password: 'demo123',
          name: 'Admin User',
          role: 'admin',
        }
      ]);
      
      console.log('📝 Demo users initialized in MongoDB');
      console.log('   - demo@example.com (User)');
      console.log('   - john@example.com (User)');
      console.log('   - admin@example.com (Admin)');
    }
  } catch (error) {
    console.error('Error initializing demo users:', error);
  }
};

// Initialize demo users on module load
initDemoUsers();

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

    // Create user (password will be hashed by pre-save hook)
    const newUser = await User.create({
      email,
      password,
      name: name || email.split('@')[0],
      role: 'user',
    }) as IUser;

    // Generate token
    const token = generateToken((newUser._id as string).toString());

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: (newUser._id as string).toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
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
      console.log(`Forgot password attempt for non-existent email: ${email}`);
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

    console.log(`Password reset email sent to: ${email}`);
    
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

    console.log(`Password reset successful for: ${user.email}`);

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
        role: user.role,
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
