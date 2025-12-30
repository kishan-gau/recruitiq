/**
 * Encryption Service
 * 
 * Provides AES-256-GCM encryption for sensitive data at rest.
 * 
 * Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Automatic key derivation using PBKDF2
 * - Secure IV generation per encryption
 * - Field-level encryption for database columns
 * - Transparent encryption/decryption
 * - Key rotation support
 * 
 * Security:
 * - Uses crypto.randomBytes for IV generation
 * - PBKDF2 with 100,000 iterations for key derivation
 * - Authentication tag prevents tampering
 * - Salt stored with encrypted data
 */

import crypto from 'crypto';
import logger from '../utils/logger.js';
import config from '../config/index.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha512';

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Derive encryption key from master key using PBKDF2
 * 
 * @param {string} masterKey - Master encryption key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
}

/**
 * Get the master encryption key from environment or secrets manager
 * 
 * @returns {string} Master encryption key
 */
function getMasterKey() {
  const key = process.env.ENCRYPTION_MASTER_KEY || config.encryption?.masterKey;
  
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY is not configured');
  }
  
  if (key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters');
  }
  
  return key;
}

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param {string} plaintext - Data to encrypt
 * @param {string} [masterKey] - Optional master key (uses default if not provided)
 * @returns {string} Encrypted data (base64 encoded: salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext, masterKey = null) {
  try {
    if (!plaintext) {
      return plaintext;
    }
    
    // Get master key
    const key = masterKey || getMasterKey();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key from master key
    const derivedKey = deriveKey(key, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt, IV, authTag, and ciphertext
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64'),
    ]).toString('base64');
    
    return result;
  } catch (error) {
    logger.error('Encryption failed', {
      error: error.message,
    });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param {string} ciphertext - Encrypted data (base64 encoded)
 * @param {string} [masterKey] - Optional master key (uses default if not provided)
 * @returns {string} Decrypted plaintext
 */
export function decrypt(ciphertext, masterKey = null) {
  try {
    if (!ciphertext) {
      return ciphertext;
    }
    
    // Get master key
    const key = masterKey || getMasterKey();
    
    // Decode base64
    const data = Buffer.from(ciphertext, 'base64');
    
    // Extract components
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive decryption key from master key
    const derivedKey = deriveKey(key, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', {
      error: error.message,
    });
    throw new Error('Failed to decrypt data');
  }
}

// ============================================================================
// FIELD-LEVEL ENCRYPTION
// ============================================================================

/**
 * Encrypt specific fields in an object
 * 
 * @param {Object} data - Object containing fields to encrypt
 * @param {Array<string>} fields - Field names to encrypt
 * @returns {Object} Object with encrypted fields
 */
export function encryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const encrypted = { ...data };
  
  for (const field of fields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      encrypted[field] = encrypt(String(encrypted[field]));
    }
  }
  
  return encrypted;
}

/**
 * Decrypt specific fields in an object
 * 
 * @param {Object} data - Object containing encrypted fields
 * @param {Array<string>} fields - Field names to decrypt
 * @returns {Object} Object with decrypted fields
 */
export function decryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const decrypted = { ...data };
  
  for (const field of fields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        logger.warn(`Failed to decrypt field: ${field}`, {
          error: error.message,
        });
        // Keep encrypted value if decryption fails
      }
    }
  }
  
  return decrypted;
}

// ============================================================================
// HASHING FUNCTIONS
// ============================================================================

/**
 * Hash data using SHA-256 (one-way)
 * Useful for searchable encrypted data (e.g., email lookup)
 * 
 * @param {string} data - Data to hash
 * @returns {string} Hex-encoded hash
 */
export function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data with salt using PBKDF2 (one-way)
 * Useful for password-like data
 * 
 * @param {string} data - Data to hash
 * @param {string} [salt] - Optional salt (generates random if not provided)
 * @returns {Object} { hash, salt }
 */
export function hashWithSalt(data, salt = null) {
  const saltBuffer = salt 
    ? Buffer.from(salt, 'hex')
    : crypto.randomBytes(SALT_LENGTH);
  
  const hashBuffer = crypto.pbkdf2Sync(
    data,
    saltBuffer,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
  
  return {
    hash: hashBuffer.toString('hex'),
    salt: saltBuffer.toString('hex'),
  };
}

/**
 * Verify hashed data
 * 
 * @param {string} data - Data to verify
 * @param {string} hash - Expected hash
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} True if data matches hash
 */
export function verifyHash(data, hash, salt) {
  const { hash: computedHash } = hashWithSalt(data, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(computedHash, 'hex')
  );
}

// ============================================================================
// KEY ROTATION
// ============================================================================

/**
 * Re-encrypt data with a new key
 * 
 * @param {string} ciphertext - Data encrypted with old key
 * @param {string} oldKey - Old master key
 * @param {string} newKey - New master key
 * @returns {string} Data encrypted with new key
 */
export function rotateEncryption(ciphertext, oldKey, newKey) {
  try {
    // Decrypt with old key
    const plaintext = decrypt(ciphertext, oldKey);
    
    // Encrypt with new key
    const newCiphertext = encrypt(plaintext, newKey);
    
    logger.info('Data re-encrypted with new key');
    
    return newCiphertext;
  } catch (error) {
    logger.error('Key rotation failed', {
      error: error.message,
    });
    throw new Error('Failed to rotate encryption key');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure random encryption key
 * 
 * @param {number} [length=64] - Key length in bytes
 * @returns {string} Hex-encoded random key
 */
export function generateEncryptionKey(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Check if data is encrypted (basic heuristic)
 * 
 * @param {string} data - Data to check
 * @returns {boolean} True if data appears to be encrypted
 */
export function isEncrypted(data) {
  if (!data || typeof data !== 'string') {
    return false;
  }
  
  try {
    // Check if it's valid base64
    const decoded = Buffer.from(data, 'base64');
    
    // Check if it has the expected minimum length
    // (salt + iv + authTag + at least some ciphertext)
    return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Validate encryption configuration
 * 
 * @returns {Object} Validation result
 */
export function validateEncryptionConfig() {
  const issues = [];
  
  try {
    getMasterKey();
  } catch (error) {
    issues.push('Master encryption key not configured or too short');
  }
  
  // Test encryption/decryption
  try {
    const testData = 'test-data-' + Date.now();
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      issues.push('Encryption test failed: decrypted data does not match');
    }
  } catch (error) {
    issues.push(`Encryption test failed: ${error.message}`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH * 8, // in bits
    iterations: PBKDF2_ITERATIONS,
  };
}

// ============================================================================
// DATABASE MIDDLEWARE
// ============================================================================

/**
 * Middleware to automatically encrypt fields before saving to database
 * 
 * @param {Array<string>} fields - Fields to encrypt
 * @returns {Function} Middleware function
 */
export function encryptMiddleware(fields) {
  return (data) => {
    return encryptFields(data, fields);
  };
}

/**
 * Middleware to automatically decrypt fields after loading from database
 * 
 * @param {Array<string>} fields - Fields to decrypt
 * @returns {Function} Middleware function
 */
export function decryptMiddleware(fields) {
  return (data) => {
    if (Array.isArray(data)) {
      return data.map(item => decryptFields(item, fields));
    }
    return decryptFields(data, fields);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  hash,
  hashWithSalt,
  verifyHash,
  rotateEncryption,
  generateEncryptionKey,
  isEncrypted,
  validateEncryptionConfig,
  encryptMiddleware,
  decryptMiddleware,
};
