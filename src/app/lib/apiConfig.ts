const DEFAULT_REMOTE_API_BASE_URL = 'https://thecourtyard-api.onrender.com/api';

export const getApiBaseUrl = () => {
  const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const isLocalhost =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  if (isLocalhost) {
    return rawBaseUrl || '/api';
  }

  if (!rawBaseUrl || rawBaseUrl === '/api') {
    return DEFAULT_REMOTE_API_BASE_URL;
  }

  return rawBaseUrl.replace(/\/+$/, '');
};

export const API_BASE_URL = getApiBaseUrl();

// Debug log to verify correct URL is being used
if (typeof window !== 'undefined') {
  console.log('[API Config] VITE_API_BASE_URL env:', import.meta.env.VITE_API_BASE_URL);
  console.log('[API Config] Resolved API_BASE_URL:', API_BASE_URL);
}
