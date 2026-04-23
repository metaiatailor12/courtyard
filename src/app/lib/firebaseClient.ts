import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

const requireEmailVerificationRaw = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION as string | undefined;

// Default to required in production, disabled in development unless explicitly overridden.
export const requiresEmailVerification = typeof requireEmailVerificationRaw === 'string'
  ? requireEmailVerificationRaw.toLowerCase() === 'true'
  : Boolean(import.meta.env.PROD);

// Helper to get current user from auth state
export const getCurrentUser = () => {
  return auth?.currentUser || null;
};

// Helper to get current user ID
export const getCurrentUserId = () => {
  return auth?.currentUser?.uid || null;
};

export const getCurrentUserToken = async () => {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken();
};
