// Test Cloudinary configuration
require('dotenv').config();

console.log('🧪 Test de configuration Cloudinary\n');

console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Défini' : '❌ Manquant');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Défini' : '❌ Manquant');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Défini' : '❌ Manquant');

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('\n✅ Toutes les variables Cloudinary sont configurées!');
  console.log('\nValeurs (partielles pour sécurité):');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY.substring(0, 5) + '...');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET.substring(0, 5) + '...');
} else {
  console.log('\n❌ Configuration incomplète!');
  console.log('Vérifiez votre fichier .env');
}
