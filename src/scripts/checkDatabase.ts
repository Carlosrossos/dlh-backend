import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import POI from '../models/POI';
import PendingModification from '../models/PendingModification';

// Load environment variables
dotenv.config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    console.log('🔗 Connexion à MongoDB...');
    console.log(`📍 URI: ${mongoURI.replace(/:[^:@]+@/, ':****@')}`); // Hide password
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connecté à MongoDB');
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log('');

    // Check Users
    console.log('👥 === USERS ===');
    const userCount = await User.countDocuments();
    console.log(`Total: ${userCount} utilisateurs`);
    
    if (userCount > 0) {
      const users = await User.find().select('email name role createdAt').limit(10);
      console.log('\nPremiers utilisateurs:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.name} (${user.role})`);
      });

      // Count by role
      const roleStats = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]);
      console.log('\nPar rôle:');
      roleStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count}`);
      });
    } else {
      console.log('⚠️  Aucun utilisateur trouvé');
    }

    console.log('\n🏔️  === POIs ===');
    const poiCount = await POI.countDocuments();
    console.log(`Total: ${poiCount} POIs`);

    if (poiCount > 0) {
      // Count by status
      const statusStats = await POI.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      console.log('\nPar statut:');
      statusStats.forEach(stat => {
        console.log(`  ${stat._id || 'undefined'}: ${stat.count}`);
      });

      // Count by category
      const categoryStats = await POI.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\nPar catégorie:');
      categoryStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count}`);
      });

      // Count by massif
      const massifStats = await POI.aggregate([
        { $group: { _id: '$massif', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      console.log('\nPar massif:');
      massifStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count}`);
      });

      // List first 10 POIs
      const pois = await POI.find()
        .select('name category massif altitude status')
        .limit(10);
      console.log('\nPremiers POIs:');
      pois.forEach((poi, index) => {
        console.log(`  ${index + 1}. ${poi.name} (${poi.category}) - ${poi.massif} - ${poi.altitude}m [${poi.status}]`);
      });

      // Check for POIs without status
      const poisWithoutStatus = await POI.countDocuments({ status: { $exists: false } });
      if (poisWithoutStatus > 0) {
        console.log(`\n⚠️  ${poisWithoutStatus} POIs sans statut (seront invisibles sur la carte)`);
      }

      // Check for approved POIs
      const approvedCount = await POI.countDocuments({ status: 'approved' });
      console.log(`\n✅ ${approvedCount} POIs approuvés (visibles sur la carte)`);
    } else {
      console.log('⚠️  Aucun POI trouvé');
    }

    // Check Pending Modifications
    console.log('\n⏳ === PENDING MODIFICATIONS ===');
    const pendingCount = await PendingModification.countDocuments();
    console.log(`Total: ${pendingCount} modifications`);

    if (pendingCount > 0) {
      const pendingStats = await PendingModification.aggregate([
        { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.type': 1, '_id.status': 1 } },
      ]);
      console.log('\nPar type et statut:');
      pendingStats.forEach(stat => {
        console.log(`  ${stat._id.type} (${stat._id.status}): ${stat.count}`);
      });
    }

    // Collections in database
    console.log('\n📦 === COLLECTIONS ===');
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Collections disponibles:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    }

    console.log('\n✅ Diagnostic terminé!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkDatabase();
