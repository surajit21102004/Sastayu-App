const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sastayu_superfast_home_services_secret_key_2026';

/**
 * Authentication Middleware
 * Validates Bearer token from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user payload if token is present, continues otherwise
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {
      // Ignore token failure for optional endpoints
    }
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  JWT_SECRET,
};
