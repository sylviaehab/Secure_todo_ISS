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
router.get('/google/callback', (req, res, next) => {
  // Handle user cancellation explicitly if visible in query
  if (req.query.error === 'access_denied') {
    logger.warn('Google OAuth cancelled by user');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4000'}?error=access_denied`);
  }

  passport.authenticate('google', { session: false }, (err, user, info) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';

    // Handle system/passport errors
    if (err) {
      logger.error('Google OAuth error', { error: err.message });
      return res.redirect(`${frontendUrl}?error=server_error`);
    }

    // Handle authentication failure
    if (!user) {
      logger.warn('Google OAuth failed: No user returned', { info });
      return res.redirect(`${frontendUrl}?error=login_failed`);
    }

    try {
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

      logger.logAuth(user._id, 'google-oauth', req.ip);

      // Construct safe redirect URL
      const targetUrl = new URL(frontendUrl);
      targetUrl.searchParams.set('authToken', authToken);
      targetUrl.searchParams.set('refreshToken', refreshToken);

      logger.info(`Redirecting to: ${targetUrl.toString()} (with tokens)`);

      // Redirect to frontend with tokens
      res.redirect(targetUrl.toString());
    } catch (error) {
      logger.error('OAuth token generation error', { error: error.message });
      res.redirect(`${frontendUrl}?error=server_error`);
    }
  })(req, res, next);
});

module.exports = router;
