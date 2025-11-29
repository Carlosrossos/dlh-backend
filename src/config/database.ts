import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connecté avec succès');
    
    // Log de la base de données utilisée
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

// Gestion des événements de connexion
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB déconnecté');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err);
});

export default connectDB;
