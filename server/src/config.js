const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || 'replace-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtCookieName: process.env.JWT_COOKIE_NAME || 'tcy_token',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  useFirebase: true,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebasePrivateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'courtyard/gallery',
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || '',
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || '',
  adminSeedName: process.env.ADMIN_SEED_NAME || 'Platform Admin',
  nodeEnv: process.env.NODE_ENV || 'development',
};

async function connectDatabase() {
  if (!env.firebaseProjectId || !env.firebasePrivateKey || !env.firebaseClientEmail) {
    throw new Error('Firebase credentials are required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  }

  return null;
}

function isProduction() {
  return env.nodeEnv === 'production';
}

module.exports = {
  env,
  connectDatabase,
  isProduction,
};
