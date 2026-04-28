import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { showErrorToast } from '../../utils/notificationHelpers';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ email: '', password: '' });

    // Validation
    if (!formData.email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      setLoading(false);
      return;
    }
    if (!formData.password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      setLoading(false);
      return;
    }

    try {
      await login(formData.email, formData.password, 'admin');
      navigate('/admin/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      
      // Map common errors to user-friendly messages
      let displayMessage = message;
      if (/invalid password|wrong password/i.test(message)) {
        displayMessage = 'Invalid password.';
      } else if (/no user found|user not found|no account found|unknown email/i.test(message)) {
        displayMessage = 'No account found with this email.';
      } else if (/invalid login credentials|invalid credentials|invalid email or password/i.test(message)) {
        displayMessage = 'Invalid email or password.';
      } else if (/admin access required/i.test(message)) {
        displayMessage = 'Admin access required. Please use an admin account.';
      }
      
      setErrors(prev => ({ ...prev, password: displayMessage }));
      showErrorToast('Login failed', displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
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
            <div className="w-20 h-20 bg-gradient-to-br from-green-900 to-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@courtyard.com"
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
                  className={`w-full px-4 py-3 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
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

            <div className="text-right">
              <Link to="/admin/forgot-password" className="text-sm text-cyan-600 hover:text-cyan-700">
                Forgot Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full bg-gradient-to-r from-green-900 to-green-800 hover:from-green-950 hover:to-green-900" 
              loading={loading}
            >
              Login to Dashboard
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
