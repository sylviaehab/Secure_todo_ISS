/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens from:
 * 1. HttpOnly cookies (preferred for security)
 * 2. Authorization header (Bearer token)
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    let token;

    // Extract token from cookie (preferred) or Authorization header
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      logger.logAuthFailure('unknown', 'No token provided', req.ip);
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required - no token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      logger.logAuthFailure(decoded.email, 'User not found', req.ip);
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed - user not found' 
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.logAuthFailure('unknown', 'Invalid token', req.ip);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      logger.logAuthFailure('unknown', 'Token expired', req.ip);
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token expired' 
      });
    } else {
      logger.error('Authentication error', { error: error.message });
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error' 
      });
    }
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

module.exports = {
  authenticate,
  verifyRefreshToken
};
