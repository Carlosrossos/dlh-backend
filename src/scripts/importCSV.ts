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
  // Zones élargies pour mieux couvrir les Alpes françaises
  // Mercantour: Alpes-Maritimes (vérifier en premier car au sud)
  if (lat >= 43.9 && lat <= 44.5 && lng >= 6.5 && lng <= 7.7) return 'Mercantour';
  // Queyras: sud-est des Écrins
  if (lat >= 44.4 && lat <= 44.9 && lng >= 6.6 && lng <= 7.2) return 'Queyras';
  // Écrins: autour de la Barre des Écrins
  if (lat >= 44.6 && lat <= 45.15 && lng >= 5.9 && lng <= 6.65) return 'Écrins';
  // Vercors: plateau du Vercors
  if (lat >= 44.7 && lat <= 45.3 && lng >= 5.2 && lng <= 5.75) return 'Vercors';
  // Chartreuse: entre Grenoble et Chambéry
  if (lat >= 45.2 && lat <= 45.55 && lng >= 5.7 && lng <= 6.0) return 'Chartreuse';
  // Belledonne: chaîne est de Grenoble
  if (lat >= 45.0 && lat <= 45.5 && lng >= 5.85 && lng <= 6.25) return 'Belledonne';
  // Bauges: entre Chambéry et Annecy
  if (lat >= 45.45 && lat <= 45.85 && lng >= 5.85 && lng <= 6.35) return 'Bauges';
  // Vanoise: entre Bourg-Saint-Maurice et Modane
  if (lat >= 45.15 && lat <= 45.6 && lng >= 6.4 && lng <= 7.15) return 'Vanoise';
  // Aravis: entre Annecy et Mont Blanc
  if (lat >= 45.75 && lat <= 46.1 && lng >= 6.25 && lng <= 6.75) return 'Aravis';
  // Mont Blanc: haute Savoie, zone élargie (fallback pour le nord des Alpes)
  if (lat >= 45.6 && lng >= 6.5) return 'Mont Blanc';
  
  // Fallback par zone géographique
  if (lat < 44.5) return 'Mercantour';
  if (lng < 5.8) return 'Vercors';
  if (lat > 45.5) return 'Mont Blanc';
  
  return 'Écrins'; // Par défaut, zone centrale des Alpes
}

// Fonction pour déterminer l'exposition (aléatoire pour l'instant)
function getRandomExposition(): string {
  const expositions = ['Nord', 'Sud', 'Est', 'Ouest', 'Nord-Est', 'Nord-Ouest', 'Sud-Est', 'Sud-Ouest'];
  return expositions[Math.floor(Math.random() * expositions.length)];
}

// Fonction pour mapper le type vers la catégorie
function mapCategory(type: string): 'Bivouac' | 'Cabane' | 'Refuge' {
  const typeLower = type.toLowerCase().trim();
  if (typeLower.includes('refuge')) return 'Refuge';
  if (typeLower.includes('cabane')) return 'Cabane';
  return 'Bivouac';
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
