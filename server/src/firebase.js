const admin = require('firebase-admin');
const { env } = require('./config');

let db = null;

function initializeFirebase() {
  if (!env.firebaseProjectId || !env.firebasePrivateKey || !env.firebaseClientEmail) {
    throw new Error('Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: env.firebaseProjectId,
        private_key_id: env.firebasePrivateKeyId,
        private_key: env.firebasePrivateKey.replace(/\\n/g, '\n'),
        client_email: env.firebaseClientEmail,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      }),
      projectId: env.firebaseProjectId,
    });
  }

  return admin.firestore();
}

function getDb() {
  if (!db) {
    db = initializeFirebase();
  }
  return db;
}

function getAuth() {
  return admin.auth();
}

async function ensureSeedAdminUser() {
  const { adminSeedEmail, adminSeedPassword, adminSeedName } = env;

  if (!adminSeedEmail || !adminSeedPassword) {
    return;
  }

  if (adminSeedPassword.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters');
  }

  const db = getDb();
  const auth = getAuth();
  const normalizedEmail = adminSeedEmail.trim().toLowerCase();

  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(userRecord.uid, {
      password: adminSeedPassword,
      displayName: adminSeedName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }

    userRecord = await auth.createUser({
      email: normalizedEmail,
      password: adminSeedPassword,
      displayName: adminSeedName,
      emailVerified: true,
      disabled: false,
    });
  }

  await db.collection('users').doc(userRecord.uid).set(
    {
      name: adminSeedName,
      email: normalizedEmail,
      role: 'admin',
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`[firebase] Admin seed user ready: ${normalizedEmail}`);
}

module.exports = {
  getDb,
  getAuth,
  initializeFirebase,
  ensureSeedAdminUser,
};
