const jwt = require('jsonwebtoken');
const { env, isProduction } = require('./config');
const { getAuth, getDb } = require('./firebase');

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function readToken(req) {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  return req.cookies?.[env.jwtCookieName] || bearerToken || null;
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    const db = getDb();
    const userRef = db.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    let profile = userDoc.exists ? (userDoc.data() || {}) : null;

    if (!profile) {
      profile = {
        name: decoded.name || decoded.email || 'User',
        email: decoded.email || '',
        emailVerified: decoded.email_verified === true,
        phone: decoded.phone_number || null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRef.set(profile);
    }

    req.auth = {
      sub: decoded.uid,
      role: profile.role || 'user',
      email: profile.email || decoded.email || '',
      emailVerified: profile.emailVerified === true || decoded.email_verified === true,
      name: profile.name || decoded.name || decoded.email || 'User',
      phone: profile.phone || decoded.phone_number || null,
    };

    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired session'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'Forbidden'));
    }

    return next();
  };
}

function notFound(req, res, next) {
  next(new ApiError(404, 'Route not found'));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error('[ERROR]', {
      statusCode,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    error: {
      message: err.message,
      statusCode,
    },
  });
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

module.exports = {
  ApiError,
  asyncHandler,
  requireAuth,
  requireRole,
  notFound,
  errorHandler,
  buildCookieOptions,
};
