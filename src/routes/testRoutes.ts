import express from 'express';
import cloudinary from '../config/cloudinary';

const router = express.Router();

// Test Cloudinary configuration
router.get('/cloudinary', (req, res) => {
  try {
    const config = cloudinary.config();
    
    res.json({
      success: true,
      configured: !!(config.cloud_name && config.api_key && config.api_secret),
      cloud_name: config.cloud_name || 'NOT SET',
      api_key: config.api_key ? config.api_key.substring(0, 5) + '...' : 'NOT SET',
      api_secret: config.api_secret ? 'SET' : 'NOT SET',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
