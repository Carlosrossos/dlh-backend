import mongoose from 'mongoose';
import dotenv from 'dotenv';
import POI from '../models/POI';

// Load environment variables
dotenv.config();

async function removeExpositions() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    await mongoose.connect(mongoURI);
    console.log('✅ Connecté à MongoDB');

    // Remove sunExposition field from all POIs
    const result = await POI.updateMany(
      {},
      { $unset: { sunExposition: '' } }
    );

    console.log(`✅ ${result.modifiedCount} POIs mis à jour`);
    console.log('🗑️  Champ sunExposition supprimé de tous les refuges');

    // Verify
    const poisWithExposition = await POI.countDocuments({ sunExposition: { $exists: true } });
    console.log(`📊 Refuges avec exposition restants: ${poisWithExposition}`);

    console.log('\n🎉 Terminé!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

removeExpositions();
