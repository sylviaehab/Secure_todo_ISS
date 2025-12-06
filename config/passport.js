/**
 * Passport.js Configuration for Google OAuth 2.0
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Serialize user for session storage
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails[0].value;
          const googleId = profile.id;
          const name = profile.displayName;
          const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          // Check if user exists
          let user = await User.findOne({ email });

          if (user) {
            // User exists - update Google ID if not set
            if (!user.googleId) {
              user.googleId = googleId;
              user.picture = picture;
              user.lastLogin = new Date();
              await user.save();
            }
          } else {
            // Create new user
            user = await User.create({
              email,
              googleId,
              name,
              picture
            });

            logger.info('New user created via Google OAuth', { userId: user._id, email });
          }

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          done(null, user);
        } catch (error) {
          logger.error('Google OAuth error', { error: error.message });
          done(error, null);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
}

module.exports = passport;
