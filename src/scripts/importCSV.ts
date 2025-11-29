import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import POI from '../models/POI';
import User from '../models/User';

// Load environment variables
dotenv.config();

// Fonction pour déterminer le massif à partir des coordonnées
function getMassifFromCoordinates(lat: number, lng: number): string {
  // Approximations basées sur les coordonnées des massifs
  if (lat >= 45.8 && lng >= 6.8) return 'Mont Blanc';
  if (lat >= 45.3 && lat < 45.5 && lng >= 6.6 && lng < 6.9) return 'Vanoise';
  if (lat >= 44.8 && lat < 45.1 && lng >= 6.2 && lng < 6.5) return 'Écrins';
  if (lat >= 44.6 && lat < 44.9 && lng >= 6.7 && lng < 7.0) return 'Queyras';
  if (lat >= 44.0 && lat < 44.3 && lng >= 7.3 && lng < 7.5) return 'Mercantour';
  if (lat >= 44.9 && lat < 45.2 && lng >= 5.4 && lng < 5.7) return 'Vercors';
  if (lat >= 45.2 && lat < 45.5 && lng >= 5.7 && lng < 6.0) return 'Chartreuse';
  if (lat >= 45.5 && lat < 45.8 && lng >= 6.1 && lng < 6.3) return 'Bauges';
  if (lat >= 45.8 && lat < 46.0 && lng >= 6.4 && lng < 6.6) return 'Aravis';
  if (lat >= 45.1 && lat < 45.4 && lng >= 5.9 && lng < 6.2) return 'Belledonne';
  return 'Mont Blanc'; // Par défaut
}

// Fonction pour déterminer l'exposition (aléatoire pour l'instant)
function getRandomExposition(): string {
  const expositions = ['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'];
  return expositions[Math.floor(Math.random() * expositions.length)];
}

// Fonction pour mapper le type vers la catégorie
function mapCategory(type: string): 'Spot' | 'Cabane' | 'Refuge' {
  const typeLower = type.toLowerCase().trim();
  if (typeLower.includes('refuge')) return 'Refuge';
  if (typeLower.includes('cabane')) return 'Cabane';
  return 'Spot';
}

async function importCSV() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    await mongoose.connect(mongoURI);
    console.log('✅ Connecté à MongoDB');

    // Create or get admin user
    let adminUser = await User.findOne({ email: 'admin@dormir-la-haut.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin',
        email: 'admin@dormir-la-haut.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('✅ Utilisateur admin créé');
    }

    // Read CSV file
    const csvPath = path.join(__dirname, '../../data/points-refuges-info vdf.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Fichier CSV non trouvé:', csvPath);
      console.log('📝 Placez votre fichier CSV dans: backend/data/points-refuges-info vdf.csv');
      process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📄 ${lines.length} lignes trouvées dans le CSV`);

    // Skip header (first line)
    const dataLines = lines.slice(1);

    const poisToInsert = [];

    for (const line of dataLines) {
      try {
        // Parse CSV line with semicolon separator
        // Format: name;type;altitude;coordinates;desc
        const parts = line.split(';');
        
        if (parts.length < 4) {
          console.warn('⚠️  Ligne ignorée (format invalide):', line);
          continue;
        }

        const name = parts[0].trim();
        const type = parts[1].trim();
        const altitude = parseInt(parts[2].trim());
        const coordsString = parts[3].trim();
        const description = parts[4] ? parts[4].trim() : '';
        
        // Parse coordinates JSON (remove outer quotes and unescape inner quotes)
        const cleanCoords = coordsString.replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"');
        const coords = JSON.parse(cleanCoords);
        
        const lat = coords.latitude;
        const lng = coords.longitude;

        if (!name || !lat || !lng || !altitude) {
          console.warn('⚠️  Ligne ignorée (données manquantes):', line);
          continue;
        }

        const poi = {
          name,
          category: mapCategory(type),
          massif: getMassifFromCoordinates(lat, lng),
          coordinates: {
            lat,
            lng,
          },
          description: description || `${name} - ${type} situé à ${altitude}m d'altitude dans les Alpes.`,
          altitude,
          // sunExposition: undefined, // Pas d'exposition pour l'instant
          photos: [], // Pas de photos pour l'instant
          likes: 0,
          likedBy: [],
          comments: [],
          createdBy: adminUser._id,
          status: 'approved' as const,
        };

        poisToInsert.push(poi);
      } catch (error) {
        console.warn('⚠️  Erreur sur la ligne:', line, error);
      }
    }

    if (poisToInsert.length === 0) {
      console.error('❌ Aucune donnée valide à importer');
      process.exit(1);
    }

    // Clear existing POIs (optional)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await POI.deleteMany({});
      console.log('🗑️  POIs existants supprimés');
    }

    // Insert POIs
    const insertedPOIs = await POI.insertMany(poisToInsert);
    console.log(`✅ ${insertedPOIs.length} POIs importés avec succès!`);

    // Display statistics
    const stats = await POI.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    console.log('\n📊 Statistiques:');
    stats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    const massifStats = await POI.aggregate([
      {
        $group: {
          _id: '$massif',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log('\n🏔️  Par massif:');
    massifStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    console.log('\n🎉 Import terminé!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    process.exit(1);
  }
}

importCSV();
