/**
 * Authentication Routes
 * Handles local authentication (register/login) and token refresh
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, verifyRefreshToken } = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin, handleValidationErrors } = require('../middleware/validator');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

/**
 * POST /api/auth/register
 * Register a new user with email/password
 */
router.post('/register', 
  authLimiter,
  validateRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.logAuthFailure(email, 'Email already registered', req.ip);
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        name
      });

      // Generate tokens
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Set HttpOnly cookies
      res.cookie('authToken', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      logger.logAuth(user._id, 'local-register', req.ip);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        authToken, // Also send in response for localStorage option
        refreshToken
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login',
  authLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        logger.logAuthFailure(email, 'User not found', req.ip);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user has password (not OAuth-only)
      if (!user.password) {
        logger.logAuthFailure(email, 'OAuth-only account', req.ip);
        return res.status(401).json({
          success: false,
          message: 'This account uses Google sign-in. Please use "Continue with Google"'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        logger.logAuthFailure(email, 'Invalid password', req.ip);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Set HttpOnly cookies
      res.cookie('authToken', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      logger.logAuth(user._id, 'local-login', req.ip);

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture
        },
        authToken, // Also send in response for localStorage option
        refreshToken
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    let refreshToken;

    // Get refresh token from cookie or body
    if (req.cookies && req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    } else if (req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const authToken = user.generateAuthToken();

    // Set new cookie
    res.cookie('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logger.info('Token refreshed', { userId: user._id });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      authToken
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear cookies)
 */
router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('authToken');
  res.clearCookie('refreshToken');

  logger.info('User logged out', { userId: req.userId });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Get user error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

module.exports = router;
