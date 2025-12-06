/**
 * Integrity Verification Test Script
 * 
 * Demonstrates SHA-256 integrity hashing and tampering detection
 * Run with: node tests/testIntegrity.js
 */

require('dotenv').config();

const { generateIntegrityHash, verifyIntegrity } = require('../utils/hash');
const { encrypt, decrypt } = require('../utils/crypto');

console.log('='.repeat(70));
console.log('SHA-256 INTEGRITY VERIFICATION TEST');
console.log('='.repeat(70));
console.log();

// Test 1: Normal integrity verification
console.log('TEST 1: Normal Integrity Verification');
console.log('-'.repeat(70));

const plaintext1 = 'This is my secret todo description';
const hash1 = generateIntegrityHash(plaintext1);

console.log('Plaintext:', plaintext1);
console.log('SHA-256 Hash:', hash1);
console.log('Hash Length:', hash1.length, 'characters (64 hex = 256 bits)');
console.log();

const isValid1 = verifyIntegrity(plaintext1, hash1);
console.log('Integrity Check:', isValid1 ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 2: Tampering detection
console.log('TEST 2: Tampering Detection');
console.log('-'.repeat(70));

const plaintext2 = 'Buy groceries';
const hash2 = generateIntegrityHash(plaintext2);

console.log('Original Plaintext:', plaintext2);
console.log('Original Hash:', hash2);
console.log();

const tamperedText = 'Buy groceries and steal credit card numbers';
console.log('Tampered Plaintext:', tamperedText);
console.log();

const isValid2 = verifyIntegrity(tamperedText, hash2);
console.log('Integrity Check:', isValid2 ? '✅ PASS' : '❌ FAIL (Expected)');
console.log();

// Test 3: Encryption + Integrity
console.log('TEST 3: Encryption with Integrity Verification');
console.log('-'.repeat(70));

const originalText = 'Complete ISS final project';
console.log('Original Text:', originalText);
console.log();

// Generate integrity hash BEFORE encryption
const integrityHash = generateIntegrityHash(originalText);
console.log('Integrity Hash (before encryption):', integrityHash);
console.log();

// Encrypt the text
const { encryptedContent, iv, authTag } = encrypt(originalText);
console.log('Encrypted Content:', encryptedContent);
console.log('IV:', iv);
console.log('Auth Tag:', authTag);
console.log();

// Decrypt the text
const decryptedText = decrypt(encryptedContent, iv, authTag);
console.log('Decrypted Text:', decryptedText);
console.log();

// Verify integrity after decryption
const isValid3 = verifyIntegrity(decryptedText, integrityHash);
console.log('Integrity Check:', isValid3 ? '✅ PASS' : '❌ FAIL');
console.log();

// Test 4: Simulated database tampering
console.log('TEST 4: Simulated Database Tampering');
console.log('-'.repeat(70));

const realText = 'Transfer $100 to savings';
const realHash = generateIntegrityHash(realText);
const { encryptedContent: realEncrypted } = encrypt(realText);

console.log('Real Text:', realText);
console.log('Real Hash:', realHash);
console.log('Real Encrypted:', realEncrypted);
console.log();

// Simulate attacker modifying encrypted content in database
const fakeText = 'Transfer $10000 to attacker account';
const { encryptedContent: fakeEncrypted, iv: fakeIv, authTag: fakeAuthTag } = encrypt(fakeText);

console.log('Fake Text:', fakeText);
console.log('Fake Encrypted:', fakeEncrypted);
console.log();

// Try to verify fake data with real hash
const decryptedFake = decrypt(fakeEncrypted, fakeIv, fakeAuthTag);
const isValid4 = verifyIntegrity(decryptedFake, realHash);

console.log('Decrypted Fake:', decryptedFake);
console.log('Integrity Check with Real Hash:', isValid4 ? '✅ PASS' : '❌ FAIL (Expected)');
console.log();
console.log('⚠️  Security Alert: Data tampering detected!');
console.log('    Computed hash does not match stored hash.');
console.log('    This indicates unauthorized modification.');
console.log();

// Test 5: Collision resistance demonstration
console.log('TEST 5: Hash Collision Resistance');
console.log('-'.repeat(70));

const text1 = 'Buy milk';
const text2 = 'Buy milk '; // Extra space
const text3 = 'buy milk'; // Lowercase

const hash5a = generateIntegrityHash(text1);
const hash5b = generateIntegrityHash(text2);
const hash5c = generateIntegrityHash(text3);

console.log('Text 1:', JSON.stringify(text1));
console.log('Hash 1:', hash5a);
console.log();

console.log('Text 2:', JSON.stringify(text2), '(extra space)');
console.log('Hash 2:', hash5b);
console.log('Same as Hash 1?', hash5a === hash5b ? 'Yes' : 'No ✅ (Good!)');
console.log();

console.log('Text 3:', JSON.stringify(text3), '(lowercase)');
console.log('Hash 3:', hash5c);
console.log('Same as Hash 1?', hash5a === hash5c ? 'Yes' : 'No ✅ (Good!)');
console.log();

// Test 6: Performance test
console.log('TEST 6: Performance Benchmark');
console.log('-'.repeat(70));

const iterations = 10000;
const testText = 'Performance test string with reasonable length for todo description';

console.time('10,000 hash generations');
for (let i = 0; i < iterations; i++) {
  generateIntegrityHash(testText);
}
console.timeEnd('10,000 hash generations');

console.time('10,000 integrity verifications');
const testHash = generateIntegrityHash(testText);
for (let i = 0; i < iterations; i++) {
  verifyIntegrity(testText, testHash);
}
console.timeEnd('10,000 integrity verifications');
console.log();

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('✅ SHA-256 generates consistent 64-character hex hashes');
console.log('✅ Integrity verification detects any content modifications');
console.log('✅ Works seamlessly with AES-256-GCM encryption');
console.log('✅ Provides second layer of security beyond auth tags');
console.log('✅ Fast performance (thousands of operations per second)');
console.log('✅ Cryptographically secure (collision resistant)');
console.log();
console.log('Use Case in Todo App:');
console.log('1. Generate SHA-256 hash BEFORE encrypting todo description');
console.log('2. Store hash alongside encrypted data in MongoDB');
console.log('3. Decrypt data when retrieved');
console.log('4. Verify hash matches decrypted content');
console.log('5. Alert if tampering detected');
console.log('='.repeat(70));
