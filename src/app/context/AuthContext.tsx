import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  auth,
  db,
  isFirebaseConfigured,
  requiresEmailVerification,
  getCurrentUser,
} from '../lib/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  role: 'user' | 'admin';
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'user' | 'admin') => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<'signed-in' | 'verification-required'>;
  resendVerificationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string, role: 'user' | 'admin') => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  loginWithGoogle: (role: 'user' | 'admin') => Promise<void>;
  completeOAuthCallback: (roleHint?: 'user' | 'admin') => Promise<{ user: User; verificationRequired: boolean } | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = 'tcy.auth.user.v1';

const EMAIL_NOT_CONFIRMED_PATTERN = /email not confirmed|confirm your email/i;
const AUTH_REQUEST_TIMEOUT_MS = 12000;
const PROFILE_LOOKUP_TIMEOUT_MS = 3000;

const buildOAuthRedirectUrl = (role: 'user' | 'admin') => {
  const configuredRedirectBase =
    (import.meta.env.VITE_OAUTH_REDIRECT_BASE_URL as string | undefined)
    || (import.meta.env.VITE_SITE_URL as string | undefined)
    || window.location.origin;

  const normalizedBase = configuredRedirectBase.trim().replace(/\/$/, '');
  return `${normalizedBase}/login?oauth=1&role=${role}`;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  const buildUserFromFirebase = async (
    firebaseUser: { uid: string; email?: string | null; phoneNumber?: string | null },
    roleHint?: 'user' | 'admin',
    options?: { skipProfileLookup?: boolean }
  ): Promise<User | null> => {
    if (!firebaseUser.email) {
      return null;
    }

    let profile: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      location?: string;
      address?: string;
    } | null = null;

    if (!options?.skipProfileLookup && db) {
      try {
        const userDoc = await withTimeout(
          getDoc(doc(db, 'users', firebaseUser.uid)),
          PROFILE_LOOKUP_TIMEOUT_MS,
          'Loading profile timed out'
        );

        if (userDoc.exists()) {
          profile = userDoc.data() as typeof profile;
        }
      } catch {
        profile = null;
      }
    }

    const derivedRole = (profile?.role as 'user' | 'admin' | undefined) || roleHint || 'user';

    return {
      id: firebaseUser.uid,
      name: profile?.name || firebaseUser.email,
      email: firebaseUser.email,
      phone: profile?.phone || firebaseUser.phoneNumber || undefined,
      location: profile?.location || profile?.address || undefined,
      address: profile?.address || undefined,
      role: derivedRole,
      emailVerified: profile?.emailVerified ?? false,
    };
  };

  const getUserFromFirebase = async (roleHint?: 'user' | 'admin'): Promise<User | null> => {
    if (!auth) {
      return null;
    }

    const firebaseUser = getCurrentUser();
    if (!firebaseUser) {
      return null;
    }

    return buildUserFromFirebase(firebaseUser as any, roleHint, { skipProfileLookup: true });
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }

    // Set persistence
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // Ignore persistence errors
    });

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) {
        return;
      }

      if (!firebaseUser) {
        setUser(null);
        return;
      }

      const nextUser = await buildUserFromFirebase(firebaseUser as any, undefined, { skipProfileLookup: true });
      if (active && nextUser) {
        setUser(nextUser);
      }

      // Load full profile in background
      void buildUserFromFirebase(firebaseUser as any).then((enrichedUser) => {
        if (active && enrichedUser) {
          setUser(enrichedUser);
        }
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, role: 'user' | 'admin') => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase auth is not configured');
    }

    try {
      const result = await withTimeout(
        signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password),
        AUTH_REQUEST_TIMEOUT_MS,
        'Login timed out. Please try again.'
      );

      const nextUser = result.user ? await buildUserFromFirebase(result.user as any, role, { skipProfileLookup: true }) : null;
      if (!nextUser) {
        throw new Error('Unable to load user profile');
      }

      if (role === 'admin' && nextUser.role !== 'admin') {
        const verifiedAdminUser = result.user ? await buildUserFromFirebase(result.user as any) : null;
        if (!verifiedAdminUser || verifiedAdminUser.role !== 'admin') {
          await signOut(auth);
          throw new Error('Admin access required for this portal');
        }

        setUser(verifiedAdminUser);
        return;
      }

      // Check if email verification is required for users
      if (requiresEmailVerification && role === 'user' && !nextUser.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
      }

      setUser(nextUser);

      // Load full profile in background
      void buildUserFromFirebase(result.user as any, role).then((enrichedUser) => {
        if (enrichedUser) {
          setUser(enrichedUser);
        }
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, phone: string, password: string): Promise<'signed-in' | 'verification-required'> => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase is not configured');
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Create new account
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const newUser = result.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        name,
        email: normalizedEmail,
        phone,
        role: 'user',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Send verification email if required
      if (requiresEmailVerification) {
        try {
          await sendEmailVerification(newUser);
        } catch {
          // Email verification sending failed, but continue
        }
        return 'verification-required';
      }

      const nextUser = await buildUserFromFirebase(newUser as any, 'user');
      if (!nextUser) {
        throw new Error('Unable to load user profile');
      }

      setUser(nextUser);
      return 'signed-in';
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in instead.');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password.');
      }
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase auth is not configured');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, 'temp');
    } catch (error: any) {
      // Expected to fail, we just need to set the current user for sendEmailVerification
    }

    const user = getCurrentUser();
    if (user) {
      try {
        await sendEmailVerification(user);
      } catch (error) {
        throw error;
      }
    } else {
      throw new Error('User not found');
    }
  };

  const requestPasswordReset = async (email: string, role: 'user' | 'admin') => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase auth is not configured');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new Error('No user found with this email');
      }
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase auth is not configured');
    }

    const password = newPassword.trim();
    if (!password) {
      throw new Error('Password is required');
    }

    const user = getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    await firebaseUpdatePassword(user, password);

    const nextUser = await buildUserFromFirebase(user as any, undefined, { skipProfileLookup: true });
    if (nextUser) {
      setUser(nextUser);
    }
  };

  const loginWithGoogle = async (role: 'user' | 'admin') => {
    if (!isFirebaseConfigured || !auth) {
      // Fallback to mock login if Firebase is not configured
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser({
        id: '1',
        name: role === 'admin' ? 'Admin User' : 'Google User',
        email: 'user@gmail.com',
        role,
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);

      if (!db) {
        throw new Error('Firestore is not configured');
      }

      // Create or update user profile
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName || result.user.email,
          email: result.user.email,
          phone: result.user.phoneNumber,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Skip profile lookup since we just created it, use the data we have
      const nextUser = await buildUserFromFirebase(result.user as any, role, { skipProfileLookup: true });
      if (!nextUser) {
        throw new Error('Unable to load user profile');
      }

      if (role === 'admin' && nextUser.role !== 'admin') {
        await signOut(auth);
        throw new Error('Admin access required for this portal');
      }

      setUser(nextUser);
      
      // Load full profile in background after a short delay to ensure Firestore is ready
      setTimeout(() => {
        void buildUserFromFirebase(result.user as any, role).then((enrichedUser) => {
          if (enrichedUser) {
            setUser(enrichedUser);
          }
        });
      }, 500);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled');
      }
      throw error;
    }
  };

  const completeOAuthCallback = async (roleHint?: 'user' | 'admin') => {
    if (!isFirebaseConfigured || !auth) {
      return null;
    }

    const user = getCurrentUser();
    if (!user) {
      return null;
    }

    const nextUser = await buildUserFromFirebase(user as any, roleHint, { skipProfileLookup: true });
    if (!nextUser) {
      return null;
    }

    if (roleHint === 'admin' && nextUser.role !== 'admin') {
      await signOut(auth);
      throw new Error('Admin access required for this portal');
    }

    setUser(nextUser);

    return {
      user: nextUser,
      verificationRequired: requiresEmailVerification && !user.emailVerified,
    };
  };

  const logout = () => {
    if (auth) {
      signOut(auth).catch(() => {
        // Ignore logout errors
      });
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        resendVerificationEmail,
        requestPasswordReset,
        updatePassword,
        loginWithGoogle,
        completeOAuthCallback,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
