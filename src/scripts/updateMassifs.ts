import mongoose from 'mongoose';
import dotenv from 'dotenv';
import POI from '../models/POI';

dotenv.config();

// Calcul de distance en km (formule Haversine)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mont Blanc: 10km radius
const MONT_BLANC = { lat: 45.8326, lng: 6.8652 };
const MONT_BLANC_RADIUS_KM = 10;

function getMassifFromCoordinates(lat: number, lng: number): string {
  // Mont Blanc: rayon de 10km autour du sommet
  if (getDistanceKm(lat, lng, MONT_BLANC.lat, MONT_BLANC.lng) <= MONT_BLANC_RADIUS_KM) {
    return 'Mont Blanc';
  }
  
  if (lat >= 43.9 && lat <= 44.5 && lng >= 6.5 && lng <= 7.7) return 'Mercantour';
  if (lat >= 44.4 && lat <= 44.9 && lng >= 6.6 && lng <= 7.2) return 'Queyras';
  if (lat >= 44.6 && lat <= 45.15 && lng >= 5.9 && lng <= 6.65) return 'Écrins';
  if (lat >= 44.7 && lat <= 45.3 && lng >= 5.2 && lng <= 5.75) return 'Vercors';
  if (lat >= 45.2 && lat <= 45.55 && lng >= 5.7 && lng <= 6.0) return 'Chartreuse';
  if (lat >= 45.0 && lat <= 45.5 && lng >= 5.85 && lng <= 6.25) return 'Belledonne';
  if (lat >= 45.45 && lat <= 45.85 && lng >= 5.85 && lng <= 6.35) return 'Bauges';
  if (lat >= 45.15 && lat <= 45.6 && lng >= 6.4 && lng <= 7.15) return 'Vanoise';
  if (lat >= 45.75 && lat <= 46.1 && lng >= 6.25 && lng <= 6.75) return 'Aravis';
  
  if (lat < 44.5) return 'Mercantour';
  if (lng < 5.8) return 'Vercors';
  if (lat > 45.5) return 'Aravis';
  
  return 'Écrins';
}

async function updateMassifs() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dormir-la-haut';
    await mongoose.connect(mongoURI);
    console.log('✅ Connecté à MongoDB');

    // Get all POIs
    const pois = await POI.find({});
    console.log(`📍 ${pois.length} POIs trouvés`);

    let updatedCount = 0;
    let montBlancBefore = 0;
    let montBlancAfter = 0;

    for (const poi of pois) {
      const oldMassif = poi.massif;
      const newMassif = getMassifFromCoordinates(poi.coordinates.lat, poi.coordinates.lng);
      
      if (oldMassif === 'Mont Blanc') montBlancBefore++;
      if (newMassif === 'Mont Blanc') montBlancAfter++;
      
      if (oldMassif !== newMassif) {
        const distance = getDistanceKm(poi.coordinates.lat, poi.coordinates.lng, MONT_BLANC.lat, MONT_BLANC.lng);
        console.log(`🔄 ${poi.name}: ${oldMassif} → ${newMassif} (distance Mont Blanc: ${distance.toFixed(1)} km)`);
        
        await POI.updateOne({ _id: poi._id }, { massif: newMassif });
        updatedCount++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   POIs "Mont Blanc" avant: ${montBlancBefore}`);
    console.log(`   POIs "Mont Blanc" après: ${montBlancAfter}`);
    console.log(`   POIs mis à jour: ${updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

updateMassifs();
