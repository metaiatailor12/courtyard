import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { Navbar } from '../components/Navbar';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? '/api'
    : RAW_API_BASE_URL;

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get('token');
        
        if (!token) {
          setStatus('error');
          setMessage('No verification token found');
          return;
        }

        // First, try to decode the token to get the email
        const response = await fetch(`${API_BASE_URL}/auth/verify-email-confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Email verification failed');
        }

        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Email verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-50">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Verifying Email</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-yellow-700" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Email Verified!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-sm text-gray-500 mb-6">
                Redirecting to login in 3 seconds...
              </p>
              <Button
                onClick={() => navigate('/login')}
                variant="primary"
                className="w-full"
              >
                Go to Login Now
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Verification Failed</h1>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-800">{message}</p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                The verification link may have expired. Please request a new one.
              </p>
              <Button
                onClick={() => navigate('/signup')}
                variant="primary"
                className="w-full"
              >
                Back to Signup
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


