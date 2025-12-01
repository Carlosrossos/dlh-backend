import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import poiRoutes from './routes/poiRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import testRoutes from './routes/testRoutes';
import { generalLimiter } from './middleware/rateLimiter';

// Import models to register them with Mongoose
import './models/User';
import './models/POI';
import './models/PendingModification';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (required for Render, rate limiting, etc.)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API (frontend handles its own CSP)
  crossOriginEmbedderPolicy: false,
})); // Secure HTTP headers
app.use(compression()); // Enable gzip compression
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit body size

// Apply rate limiting to all routes
app.use(generalLimiter);

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: '🏔️ Dormir Là-Haut API', status: 'running' });
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from the backend!' });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// POI routes
app.use('/api/pois', poiRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// User routes
app.use('/api/user', userRoutes);

// Test routes
app.use('/api/test', testRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  
  // Keep-alive ping pour éviter le cold start sur Render (free tier)
  const BACKEND_URL = process.env.BACKEND_URL;
  if (BACKEND_URL && process.env.NODE_ENV === 'production') {
    const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
    
    setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`);
        if (response.ok) {
          console.log(`🏓 Keep-alive ping successful at ${new Date().toISOString()}`);
        }
      } catch (error) {
        console.log(`⚠️ Keep-alive ping failed:`, error);
      }
    }, PING_INTERVAL);
    
    console.log(`🔄 Keep-alive ping enabled (every 14 min) for ${BACKEND_URL}`);
  }
});
