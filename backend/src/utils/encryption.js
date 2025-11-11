/**
 * Encryption Utility
 * 
 * Provides encryption/decryption for sensitive data like passwords and API keys
 */

import crypto from 'crypto';
import logger from './logger.js';

// Get encryption key from environment or use default (SHOULD BE CHANGED IN PRODUCTION)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this-in-production-32chars';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Ensure key is 32 bytes for AES-256
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

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
