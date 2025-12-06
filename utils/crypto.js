/**
 * AES-256-GCM Encryption Utility (ISS Security Primitive)
 * 
 * Implements authenticated encryption with:
 * - AES-256-GCM cipher mode
 * - Unique 12-byte Initialization Vector (IV) per encryption
 * - 16-byte Authentication Tag for integrity verification
 * - Base64 encoding for storage compatibility
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the AES-256 encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} if AES_KEY is not configured or invalid
 */
function getEncryptionKey() {
  if (!process.env.AES_KEY) {
    throw new Error('AES_KEY environment variable is not set');
  }
  
  const key = Buffer.from(process.env.AES_KEY, 'base64');
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`AES key must be exactly ${KEY_LENGTH} bytes (256 bits)`);
  }
  
  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param {string} plaintext - The text to encrypt
 * @returns {Object} Encryption result containing:
 *   - encryptedContent: Base64-encoded ciphertext
 *   - iv: Base64-encoded initialization vector
 *   - authTag: Base64-encoded authentication tag
 * @throws {Error} if encryption fails
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    
    // Generate a unique random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedContent: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param {string} encryptedContent - Base64-encoded ciphertext
 * @param {string} ivBase64 - Base64-encoded initialization vector
 * @param {string} authTagBase64 - Base64-encoded authentication tag
 * @returns {string} Decrypted plaintext
 * @throws {Error} if decryption fails or authentication fails
 */
function decrypt(encryptedContent, ivBase64, authTagBase64) {
  if (!encryptedContent || !ivBase64 || !authTagBase64) {
    throw new Error('Missing required decryption parameters');
  }

  try {
    const key = getEncryptionKey();
    
    // Decode base64 inputs
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Validate IV and authTag lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`IV must be exactly ${IV_LENGTH} bytes`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Auth tag must be exactly ${AUTH_TAG_LENGTH} bytes`);
    }
    
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the ciphertext
    let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Authentication failure or decryption error
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = {
  encrypt,
  decrypt,
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  KEY_LENGTH
};
