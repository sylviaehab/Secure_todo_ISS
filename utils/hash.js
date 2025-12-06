/**
 * SHA-256 Integrity Hashing Utility (ISS Security Primitive)
 * 
 * Implements document integrity verification using:
 * - SHA-256 cryptographic hash function
 * - Hex string encoding for storage
 * - Tamper detection capabilities
 */

const crypto = require('crypto');

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';

/**
 * Generate SHA-256 hash of plaintext content
 * 
 * This hash is computed BEFORE encryption and stored alongside
 * the encrypted content. It allows detection of unauthorized
 * modifications to the encrypted data.
 * 
 * @param {string} plaintext - The content to hash
 * @returns {string} SHA-256 hash as hex string (64 characters)
 * @throws {Error} if hashing fails
 */
function generateIntegrityHash(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  try {
    const hash = crypto
      .createHash(HASH_ALGORITHM)
      .update(plaintext, 'utf8')
      .digest(HASH_ENCODING);
    
    return hash;
  } catch (error) {
    throw new Error(`Hash generation failed: ${error.message}`);
  }
}

/**
 * Verify integrity of decrypted content against stored hash
 * 
 * @param {string} plaintext - The decrypted content to verify
 * @param {string} storedHash - The stored SHA-256 hash (hex)
 * @returns {boolean} true if integrity verified, false otherwise
 */
function verifyIntegrity(plaintext, storedHash) {
  if (!plaintext || !storedHash) {
    return false;
  }

  try {
    const computedHash = generateIntegrityHash(plaintext);
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch (error) {
    // If comparison fails (e.g., different lengths), integrity check fails
    return false;
  }
}

/**
 * Generate integrity hash and validate it immediately (for testing)
 * 
 * @param {string} plaintext - The content to hash and verify
 * @returns {Object} Result containing hash and verification status
 */
function testIntegrity(plaintext) {
  const hash = generateIntegrityHash(plaintext);
  const isValid = verifyIntegrity(plaintext, hash);
  
  return {
    hash,
    isValid,
    algorithm: HASH_ALGORITHM,
    hashLength: hash.length
  };
}

module.exports = {
  generateIntegrityHash,
  verifyIntegrity,
  testIntegrity,
  HASH_ALGORITHM,
  HASH_ENCODING
};
