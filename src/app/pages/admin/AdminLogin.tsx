import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, Shield, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

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
      setErrors(prev => ({ ...prev, password: message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center p-4">
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
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
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

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
            />

            <div className="text-right">
              <Link to="/admin/forgot-password" className="text-sm text-cyan-600 hover:text-cyan-700">
                Forgot Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" 
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
