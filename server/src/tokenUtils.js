const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('./config');

/**
 * Generate a secure verification token using UUID
 * Returns both the token and its hash for storage
 */
function generateVerificationToken() {
  const token = crypto.randomUUID();
  return token;
}

/**
 * Generate a JWT verification token
 * Includes email in the payload for additional verification
 */
function generateJWTVerificationToken(email) {
  const token = jwt.sign(
    { email, type: 'email_verification' },
    env.jwtSecret,
    { expiresIn: `${env.emailVerificationExpiryMinutes}m` }
  );
  return token;
}

/**
 * Verify JWT token
 */
function verifyJWTToken(token) {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate token expiry time
 */
function getTokenExpiryTime() {
  const expiryMs = env.emailVerificationExpiryMinutes * 60 * 1000;
  return new Date(Date.now() + expiryMs);
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiryTime) {
  return new Date() > new Date(expiryTime);
}

module.exports = {
  generateVerificationToken,
  generateJWTVerificationToken,
  verifyJWTToken,
  getTokenExpiryTime,
  isTokenExpired,
};
