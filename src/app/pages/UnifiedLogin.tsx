import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { showErrorToast, showInfoToast, showSuccessToast } from '../utils/notificationHelpers';
import { requiresEmailVerification } from '../lib/firebaseClient';

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

export const UnifiedLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, login, loginWithGoogle, resendVerificationEmail, completeOAuthCallback } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/home');
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    const storedNotice = window.sessionStorage.getItem('tcy.auth.notice');
    if (storedNotice) {
      setNotice(storedNotice);
      window.sessionStorage.removeItem('tcy.auth.notice');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hasAuthCode = searchParams.has('code');
    const hasOAuthIntent = searchParams.get('oauth') === '1';
    const hasHashToken = /access_token=|id_token=|error=|type=/.test(window.location.hash || '');

    if (!hasAuthCode && !hasOAuthIntent && !hasHashToken) {
      return;
    }

    const roleHint = searchParams.get('role') === 'admin' ? 'admin' : 'user';

    const run = async () => {
      setOauthLoading(true);

      try {
        const result = await completeOAuthCallback(roleHint);
        if (!active) {
          return;
        }

        if (!result) {
          navigate(roleHint === 'admin' ? '/admin/login' : '/user/login', { replace: true });
          return;
        }

        if (result.verificationRequired) {
          setNotice(`Verification email sent to ${result.user.email}. Please verify and then sign in again.`);
          showInfoToast('Verification required', 'Please verify your email from your inbox to continue.');
          navigate('/login', { replace: true });
          return;
        }

        navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/user/home', { replace: true });
      } catch (oauthError) {
        if (!active) {
          return;
        }

        const message = oauthError instanceof Error ? oauthError.message : 'Google login failed. Please try again.';
        setErrors(prev => ({ ...prev, password: message }));
        showErrorToast('Google login failed', message);
        navigate('/login', { replace: true });
      } finally {
        if (active) {
          setOauthLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [completeOAuthCallback, navigate, searchParams]);

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
      const loginRole = location.pathname.startsWith('/admin') ? 'admin' : 'user';
      await login(normalizedEmail, formData.password, loginRole);
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

  const isEmailUnconfirmedError = requiresEmailVerification && /email not confirmed|confirm your email/i.test(errors.password || '');

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


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-start justify-center px-3 py-6 sm:px-4 md:items-center">
      <div className="w-full max-w-sm sm:max-w-md">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 sm:mb-6 sm:text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <GlassCard className="w-full p-5 shadow-xl sm:p-6 md:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl mb-2">Welcome Back!</h1>
            <p className="text-sm text-gray-600 sm:text-base">Login to your account</p>
          </div>

          {notice && (
            <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-12 pr-12 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || oauthLoading}
              className="w-full"
            >
              {loading || oauthLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {isEmailUnconfirmedError && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-3">Need to verify your email?</p>
              <Button
                type="button"
                variant="outline"
                disabled={resendingVerification || resendCooldown > 0}
                onClick={handleResendVerification}
                className="w-full"
              >
                {resendingVerification
                  ? 'Sending...'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </Button>
            </div>
          )}


          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/user/register"
                className="text-green-900 hover:text-green-950 font-semibold"
              >
                Sign up
              </Link>
            </p>
            <p className="text-gray-600">
              <Link
                to="/user/forgot-password"
                className="text-green-900 hover:text-green-950 font-semibold"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};


