import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { showErrorToast, showInfoToast, showSuccessToast } from '../../utils/notificationHelpers';
import { requiresEmailVerification } from '../../lib/firebaseClient';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapLoginError = (message: string) => {
  if (/timed out|timeout/i.test(message)) {
    return 'Login is taking too long. Please check your internet and try again.';
  }

  if (/invalid login credentials|invalid credentials|invalid email or password/i.test(message)) {
    return 'Invalid email or password.';
  }

  if (/please verify your email/i.test(message)) {
    return 'Please verify your email before logging in. Check your inbox for the verification link.';
  }

  if (/email not confirmed|confirm your email/i.test(message)) {
    if (!requiresEmailVerification) {
      return 'Unable to sign in. Please contact support if this continues.';
    }

    return 'Email not confirmed. We have sent a verification email. Please verify and try again.';
  }

  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  return message || 'Unable to sign in. Please try again.';
};

export const UserLogin = () => {
  const navigate = useNavigate();
  const { user, login, loginWithGoogle, resendVerificationEmail } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const storedNotice = window.sessionStorage.getItem('tcy.auth.notice');
    if (storedNotice) {
      setNotice(storedNotice);
      window.sessionStorage.removeItem('tcy.auth.notice');
    }
  }, []);

  // Handle redirect after successful Google login
  useEffect(() => {
    if (!googleLoggingIn || !user) {
      return;
    }

    if (requiresEmailVerification) {
      setGoogleLoggingIn(false);
      window.sessionStorage.setItem(
        'tcy.auth.notice',
        `Verification email sent to ${user.email}. Please verify your email before continuing.`
      );
      showInfoToast('Verification required', 'Please verify your email from your inbox to continue.');
      navigate('/user/login', { replace: true });
    } else {
      navigate('/user/home', { replace: true });
    }
  }, [user, googleLoggingIn, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ email: '', password: '' });

    const normalizedEmail = formData.email.trim().toLowerCase();

    // Validation
    if (!normalizedEmail) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      setLoading(false);
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrors(prev => ({ ...prev, email: 'Enter a valid email address' }));
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      setLoading(false);
      return;
    }

    try {
      await login(normalizedEmail, formData.password, 'user');
      navigate('/user/home');
      showSuccessToast('Login successful!');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to sign in';
      const message = mapLoginError(rawMessage);
      setErrors(prev => ({ ...prev, password: message }));

      if (/please verify your email/i.test(rawMessage)) {
        showInfoToast('Verification required', 'Check your inbox for the verification email. Once verified, you can log in.');
      } else if (requiresEmailVerification && /email not confirmed|confirm your email/i.test(rawMessage)) {
        showInfoToast('Verification required', 'Please verify your email before logging in.');
      } else {
        showErrorToast('Login failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isEmailUnconfirmedError = requiresEmailVerification && /email not confirmed|confirm your email|please verify your email/i.test(errors.password || '');

  const handleResendVerification = async () => {
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrors(prev => ({ ...prev, email: 'Enter your email to resend verification' }));
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrors(prev => ({ ...prev, email: 'Enter a valid email address to resend verification' }));
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setResendingVerification(true);
    try {
      await resendVerificationEmail(normalizedEmail);
      setNotice('Verification email sent. Please check your inbox and spam folder, then try logging in again.');
      setErrors(prev => ({ ...prev, password: '' }));
      setResendCooldown(30);
      showSuccessToast('Verification email sent');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend verification email.';
      setErrors(prev => ({ ...prev, password: message }));
      showErrorToast('Could not resend email', message);
    } finally {
      setResendingVerification(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setGoogleLoggingIn(true);
    try {
      await loginWithGoogle('user');
    } catch (error) {
      setGoogleLoggingIn(false);
      const message = error instanceof Error ? error.message : 'Google login failed. Please try again.';
      showErrorToast('Google login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
            <p className="text-gray-600">Login to book your favorite courts</p>
          </div>

          {notice && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="your.email@example.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              autoComplete="email"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              autoComplete="current-password"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, password: e.target.value }));
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              error={errors.password}
            />

            {isEmailUnconfirmedError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="mb-2">Your email is not verified yet.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification || resendCooldown > 0}
                  className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendingVerification
                    ? 'Sending verification email...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
              </div>
            )}

            <div className="text-right">
              <Link to="/user/forgot-password" className="text-sm text-[#808000] hover:text-[#5D5E1F]">
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Login
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Login with Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/user/register" className="text-[#808000] hover:text-[#5D5E1F] font-medium">
              Register here
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

