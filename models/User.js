/**
 * User Model (ISS Security Requirements)
 * 
 * Security features:
 * - bcrypt password hashing with exactly 12 rounds
 * - Password validation and strength requirements
 * - Unique email constraint with index
 * - JWT token generation
 * - Google OAuth integration support
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// bcrypt rounds MUST be exactly 12 per ISS requirements
const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: function() {
      // Password required only for local auth (not OAuth)
      return !this.googleId;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  picture: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Index for faster email lookups
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

/**
 * Hash password before saving (pre-save hook)
 * Only hashes if password is modified
 */
userSchema.pre('save', async function(next) {
  // Only hash password if it's new or modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with exactly 12 rounds per ISS requirements
    const hashedPassword = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare provided password with stored hash
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>} True if password matches
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate JWT access token for user
 * @returns {string} JWT token
 */
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id.toString(),
    email: this.email
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate JWT refresh token for user
 * @returns {string} JWT refresh token
 */
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    userId: this._id.toString(),
    type: 'refresh'
  };

  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * Convert user to JSON (remove sensitive data)
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
