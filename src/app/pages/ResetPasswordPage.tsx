import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Lock, LoaderCircle } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { showErrorToast, showSuccessToast } from '../utils/notificationHelpers';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updatePassword, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role = useMemo<'user' | 'admin'>(() => {
    return location.pathname.startsWith('/admin') ? 'admin' : 'user';
  }, [location.pathname]);

  const loginPath = role === 'admin' ? '/admin/login' : '/user/login';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('New password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      showSuccessToast('Password updated successfully');
      window.sessionStorage.setItem('tcy.auth.notice', 'Your password was updated. Please login with your new password.');
      navigate(loginPath, { replace: true });
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Unable to update password';
      setError(message);
      showErrorToast('Password reset failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(loginPath)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </button>

        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
            <p className="text-gray-600">Set a new password for your account.</p>
          </div>

          {!user ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Please sign in to reset your password.
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          ) : null}

          {user ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="New Password"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) {
                    setError('');
                  }
                }}
                error={error}
              />

              <Input
                label="Confirm New Password"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) {
                    setError('');
                  }
                }}
              />

              <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={!user}>
                Update Password
              </Button>
            </form>
          ) : null}

          <p className="mt-6 text-center text-sm text-gray-600">
            <Link to={loginPath} className="text-[#808000] hover:text-[#5D5E1F] font-medium">
              Return to login
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};


