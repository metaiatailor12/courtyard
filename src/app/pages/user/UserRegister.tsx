import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { showErrorToast, showSuccessToast, showInfoToast } from '../../utils/notificationHelpers';
import { requiresEmailVerification } from '../../lib/firebaseClient';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s()-]{10,16}$/;

const getPasswordError = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }

  return '';
};

const mapRegisterError = (message: string) => {
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  if (/already registered|user already registered|already exists/i.test(message)) {
    return 'This email is already registered. Please log in instead.';
  }

  if (/invalid email/i.test(message)) {
    return 'Please enter a valid email address.';
  }

  return message || 'Unable to create your account. Please try again.';
};

export const UserRegister = () => {
  const navigate = useNavigate();
  const { user, register, loginWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');

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
      navigate('/user/login');
    } else {
      navigate('/user/home');
    }
  }, [user, googleLoggingIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
    setFormError('');

    const normalizedName = formData.name.trim().replace(/\s+/g, ' ');
    const normalizedPhone = formData.phone.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();
    const passwordError = getPasswordError(formData.password);

    // Validation
    let hasError = false;
    if (!normalizedName) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      hasError = true;
    } else if (normalizedName.length < 2) {
      setErrors(prev => ({ ...prev, name: 'Enter your full name' }));
      hasError = true;
    }

    if (!normalizedPhone) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
      hasError = true;
    } else if (!PHONE_PATTERN.test(normalizedPhone)) {
      setErrors(prev => ({ ...prev, phone: 'Enter a valid phone number' }));
      hasError = true;
    }

    if (!normalizedEmail) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      hasError = true;
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrors(prev => ({ ...prev, email: 'Enter a valid email address' }));
      hasError = true;
    }

    if (!formData.password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      hasError = true;
    } else if (passwordError) {
      setErrors(prev => ({ ...prev, password: passwordError }));
      hasError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      const result = await register(normalizedName, normalizedEmail, normalizedPhone, formData.password);
      if (requiresEmailVerification && result === 'verification-required') {
        window.sessionStorage.setItem(
          'tcy.auth.notice',
          'Account created. We sent a verification link to your email. Verify your account, then log in.'
        );
        navigate('/user/login');
        return;
      }

      showSuccessToast('Registration successful!');
      navigate('/user/home');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to register';
      const message = mapRegisterError(rawMessage);
      setFormError(message);
      showErrorToast('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setGoogleLoggingIn(true);
    try {
      await loginWithGoogle('user');
    } catch (error) {
      setGoogleLoggingIn(false);
      const message = error instanceof Error ? error.message : 'Google signup failed. Please try again.';
      showErrorToast('Google signup failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-50 flex items-center justify-center p-4 py-12">
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
            <p className="text-gray-600">Join thecourtyard today!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              icon={<User className="w-5 h-5" />}
              value={formData.name}
              autoComplete="name"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }));
                }
              }}
              error={errors.name}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              icon={<Phone className="w-5 h-5" />}
              value={formData.phone}
              autoComplete="tel"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, phone: e.target.value }));
                if (errors.phone) {
                  setErrors(prev => ({ ...prev, phone: '' }));
                }
              }}
              error={errors.phone}
            />

            <Input
              label="Email (Gmail)"
              type="email"
              placeholder="your.email@gmail.com"
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
              placeholder="Create a strong password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              autoComplete="new-password"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, password: e.target.value }));
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.confirmPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
              }}
              error={errors.confirmPassword}
            />

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Register
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
              Sign up with Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/user/login" className="text-[#808000] hover:text-[#5D5E1F] font-medium">
              Login here
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

