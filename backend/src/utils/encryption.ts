/**
 * Encryption Utility
 * 
 * Provides encryption/decryption for sensitive data like passwords and API keys
 * Uses AES-256-CBC with authenticated encryption
 */

import crypto from 'crypto';
import logger from './logger.js';
import config from '../config/index.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get encryption key from config (fail-fast if missing)
 * @returns {Buffer} - 32-byte encryption key
 */
function getEncryptionKey() {
  const keyHex = config.encryption?.masterKey;
  
  if (!keyHex) {
    throw new Error(
      'CRITICAL: ENCRYPTION_KEY is not configured!\n' +
      'Set ENCRYPTION_KEY environment variable with a 64-character hex string.\n' +
      'Generate with: openssl rand -hex 32'
    );
  }
  
  if (keyHex.length < 64) {
    throw new Error(
      `CRITICAL: ENCRYPTION_KEY is too short!\n` +
      `Current length: ${keyHex.length} characters\n` +
      `Required minimum: 64 characters (256 bits)\n` +
      `Generate with: openssl rand -hex 32`
    );
  }
  
  // Convert hex string to 32-byte buffer for AES-256
  const key = Buffer.from(keyHex.substring(0, 64), 'hex');
  
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  
  return key;
}

/**
 * Encrypt a string
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text with IV prepended (format: iv:encryptedData)
 */
export function encrypt(text) {
  if (!text) {
    return null;
  }

  try {
    const KEY = getEncryptionKey(); // Get validated key
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string
 * @param {string} encryptedText - Encrypted text with IV (format: iv:encryptedData)
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) {
    return null;
  }

  try {
    const KEY = getEncryptionKey(); // Get validated key
    // Split IV and encrypted data
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string using SHA-256 (one-way, for passwords)
 * @param {string} text - Plain text to hash
 * @returns {string} - Hashed text
 */
export function hash(text) {
  if (!text) {
    return null;
  }

  try {
    return crypto.createHash('sha256').update(text).digest('hex');
  } catch (error) {
    logger.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * Compare a plain text string with a hash
 * @param {string} text - Plain text
 * @param {string} hashedText - Hashed text to compare against
 * @returns {boolean} - True if they match
 */
export function compareHash(text, hashedText) {
  if (!text || !hashedText) {
    return false;
  }

  try {
    const textHash = hash(text);
    return textHash === hashedText;
  } catch (error) {
    logger.error('Hash comparison error:', error);
    return false;
  }
}
