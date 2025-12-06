/**
 * Google OAuth Routes
 * Handles Google OAuth 2.0 authentication flow
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const logger = require('../utils/logger');

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:4000'
  }),
  (req, res) => {
    try {
      // Generate tokens
      const authToken = req.user.generateAuthToken();
      const refreshToken = req.user.generateRefreshToken();

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

      logger.logAuth(req.user._id, 'google-oauth', req.ip);

      // Redirect to frontend with tokens in URL (for localStorage option)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
      res.redirect(`${frontendUrl}?authToken=${authToken}&refreshToken=${refreshToken}`);
    } catch (error) {
      logger.error('OAuth callback error', { error: error.message });
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4000'}?error=oauth_failed`);
    }
  }
);

module.exports = router;
