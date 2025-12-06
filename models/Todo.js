/**
 * Todo Model (ISS Security Requirements)
 * 
 * Security features:
 * - AES-256-GCM encrypted content with unique IV per document
 * - SHA-256 integrity hash for tamper detection
 * - Authentication tag for GCM mode verification
 * - User-specific todo isolation
 */

const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  // Encrypted content (base64 encoded)
  encryptedContent: {
    type: String,
    required: [true, 'Encrypted content is required']
  },
  // Initialization Vector for AES-256-GCM (base64 encoded, 12 bytes)
  iv: {
    type: String,
    required: [true, 'IV is required']
  },
  // Authentication Tag for GCM mode (base64 encoded, 16 bytes)
  authTag: {
    type: String,
    required: [true, 'Authentication tag is required']
  },
  // SHA-256 integrity hash of plaintext (hex string, 64 characters)
  // This allows detection of unauthorized modifications
  integrityHash: {
    type: String,
    required: [true, 'Integrity hash is required'],
    length: 64 // SHA-256 produces 64 hex characters
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient user-specific queries
todoSchema.index({ userId: 1, createdAt: -1 });
todoSchema.index({ userId: 1, completed: 1 });

/**
 * Update the updatedAt timestamp before saving
 */
todoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Static method to verify integrity of a todo
 * @param {Object} todo - Todo document
 * @param {string} decryptedContent - Decrypted plaintext
 * @returns {boolean} True if integrity check passes
 */
todoSchema.statics.verifyIntegrity = function(todo, decryptedContent) {
  const { generateIntegrityHash } = require('../utils/hash');
  const computedHash = generateIntegrityHash(decryptedContent);
  return computedHash === todo.integrityHash;
};

/**
 * Instance method to check if todo belongs to user
 * @param {string} userId - User ID to check
 * @returns {boolean} True if todo belongs to user
 */
todoSchema.methods.belongsToUser = function(userId) {
  return this.userId.toString() === userId.toString();
};

/**
 * Convert todo to JSON (for API responses)
 */
todoSchema.methods.toJSON = function() {
  const todo = this.toObject();
  todo.id = todo._id;
  delete todo._id;
  delete todo.__v;
  return todo;
};

const Todo = mongoose.model('Todo', todoSchema);

module.exports = Todo;
