import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Navbar } from '../components/Navbar';
import { Mail, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../utils/notificationHelpers';
import { getAPI_BASE_URL } from '../lib/apiConfig';

interface VerificationRequiredPageProps {
  email?: string;
  onResendSuccess?: () => void;
}

export const VerificationRequiredPage = ({ email: initialEmail = '', onResendSuccess }: VerificationRequiredPageProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resending || resendCooldown > 0) return;

    setError('');
    setResending(true);

    try {
      const response = await fetch(`${getAPI_BASE_URL()}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || 'Failed to resend verification email');
      }

      setResendCooldown(60);
      showSuccessToast('Verification email sent! Check your inbox (and spam folder).');
      onResendSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification email';
      setError(message);
      showErrorToast(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-3 text-center">Email Verification Required</h1>
          <p className="text-gray-600 text-center mb-6">
            Before you can access the dashboard, you need to verify your email address.
          </p>

          {email && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                📧 Verification email sent to: <strong>{email}</strong>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-green-800 font-semibold mb-3">What to do next:</p>
            <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
              <li>Check your email inbox (and spam/promotions folder)</li>
              <li>Click the verification link in the email</li>
              <li>Return here or go to login after verification</li>
              <li>You'll then have full access to the dashboard</li>
            </ol>
          </div>

          <Button
            onClick={handleResendEmail}
            disabled={resending || resendCooldown > 0 || !email}
            variant="primary"
            className="w-full mb-3"
          >
            {resending ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend Email (${resendCooldown}s)`
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2 inline" />
                Resend Verification Email
              </>
            )}
          </Button>

          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full"
          >
            <ArrowRight className="w-4 h-4 mr-2 inline" />
            Go to Login
          </Button>

          <p className="text-center text-xs text-gray-500 mt-6">
            Didn't receive the email? Check your spam folder or contact support if you need help.
          </p>
        </div>
      </div>
    </div>
  );
};
