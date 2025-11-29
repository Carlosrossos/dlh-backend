import mongoose from 'mongoose';
import dotenv from 'dotenv';
import POI from '../models/POI';

dotenv.config();

async function checkPOIStatus() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connecté à MongoDB');
    console.log(`📊 Base de données: ${mongoose.connection.name}\n`);

    // Total POIs
    const total = await POI.countDocuments();
    console.log(`📍 Total POIs: ${total}`);

    // Par statut
    console.log('\n🔍 Répartition par statut:');
    const byStatus = await POI.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byStatus.forEach(stat => {
      console.log(`   ${stat._id || 'UNDEFINED/NULL'}: ${stat.count}`);
    });

    // POIs sans statut
    const noStatus = await POI.countDocuments({ status: { $exists: false } });
    console.log(`\n⚠️  POIs SANS champ status: ${noStatus}`);

    // POIs avec status null
    const nullStatus = await POI.countDocuments({ status: null });
    console.log(`⚠️  POIs avec status NULL: ${nullStatus}`);

    // POIs approved
    const approved = await POI.countDocuments({ status: 'approved' });
    console.log(`\n✅ POIs APPROVED (visibles): ${approved}`);

    // Exemples de POIs
    console.log('\n📋 Exemples de POIs (5 premiers):');
    const samples = await POI.find().limit(5).select('name status category').lean();
    samples.forEach((poi, i) => {
      console.log(`   ${i+1}. ${poi.name} - status: "${poi.status}" (${typeof poi.status})`);
    });

    // Vérifier la structure
    console.log('\n🔎 Structure d\'un POI:');
    const onePoi = await POI.findOne().lean();
    if (onePoi) {
      console.log('   Champs présents:', Object.keys(onePoi).join(', '));
      console.log(`   status value: "${onePoi.status}"`);
      console.log(`   status type: ${typeof onePoi.status}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkPOIStatus();
