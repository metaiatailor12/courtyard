import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { requiresEmailVerification } from '../lib/firebaseClient';
import { VerificationRequiredPage } from '../pages/VerificationRequiredPage';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin';
  requireEmailVerification?: boolean;
}

/**
 * ProtectedRoute component that enforces authentication and email verification requirements
 * 
 * Features:
 * - Redirects to login if not authenticated
 * - Shows verification required page if email not verified (when requiresEmailVerification is enabled)
 * - Enforces role-based access (admin vs user)
 * - Handles loading states gracefully
 */
export const ProtectedRoute = ({
  children,
  requiredRole = 'user',
  requireEmailVerification: forceEmailVerification,
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Determine if email verification is required
  const emailVerificationRequired = forceEmailVerification !== undefined 
    ? forceEmailVerification 
    : requiresEmailVerification;

  // Still loading - show spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to login
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Check role-based access
  if (requiredRole === 'admin' && user.role !== 'admin') {
    navigate('/login', { replace: true });
    return null;
  }

  if (requiredRole === 'user' && user.role === 'admin') {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  // Check email verification for users (not admins)
  if (emailVerificationRequired && requiredRole === 'user' && !user.emailVerified) {
    return <VerificationRequiredPage email={user.email} />;
  }

  // All checks passed - render protected content
  return <>{children}</>;
};
