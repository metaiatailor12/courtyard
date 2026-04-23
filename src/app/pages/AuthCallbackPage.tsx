import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const roleParam = searchParams.get('role');
      const roleHint = roleParam === 'admin' ? 'admin' : 'user';

      try {
        const result = await completeOAuthCallback(roleHint);
        if (!mounted) {
          return;
        }

        if (!result) {
          navigate(roleHint === 'admin' ? '/admin/login' : '/user/login', { replace: true });
          return;
        }

        if (result.verificationRequired) {
          setVerificationPending(true);
          setUserEmail(result.user.email);
          return;
        }

        navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/user/home', { replace: true });
      } catch (callbackError) {
        if (!mounted) {
          return;
        }

        const message = callbackError instanceof Error ? callbackError.message : 'OAuth callback failed';
        setError(message);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [completeOAuthCallback, navigate, searchParams]);

  // Show error only if one occurs, otherwise no UI (silent background processing)
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-600 mb-3">Authentication Failed</h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (verificationPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <Mail className="w-16 h-16 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify Your Email</h1>
          <p className="text-gray-600 mb-2">We've sent a verification link to:</p>
          <p className="text-lg font-semibold text-emerald-600 mb-6">{userEmail}</p>
          <p className="text-sm text-gray-600">
            Click the verification link in the email to complete your signup and access your account.
          </p>
        </div>
      </div>
    );
  }

  // No UI shown during successful authentication (silent redirect)
  return null;
};
