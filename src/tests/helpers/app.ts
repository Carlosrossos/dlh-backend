import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/authRoutes';
import poiRoutes from '../../routes/poiRoutes';
import adminRoutes from '../../routes/adminRoutes';
import userRoutes from '../../routes/userRoutes';

// Import models to register them with Mongoose
import '../../models/User';
import '../../models/POI';
import '../../models/PendingModification';

/**
 * Creates an Express app instance for testing
 * Without rate limiting to avoid flaky tests
 */
export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/pois', poiRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/user', userRoutes);

  // Health check
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
