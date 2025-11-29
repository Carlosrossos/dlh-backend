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
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from the backend!' });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth routes
console.log('📌 Registering auth routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');

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
});
