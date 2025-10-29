/**
 * Database Encryption Helpers
 * 
 * Provides transparent encryption/decryption for sensitive database fields.
 * 
 * Features:
 * - Field-level encryption for PII data
 * - Transparent encryption on save
 * - Transparent decryption on load
 * - Searchable encrypted fields (hashed)
 * - Batch encryption/decryption
 * - Key rotation support
 * 
 * Usage:
 * - Use encryptModel() to define encrypted fields for a model
 * - Use encryptBeforeSave() as a pre-save hook
 * - Use decryptAfterLoad() as a post-load hook
 */

import encryption from '../services/encryption.js';
import logger from '../utils/logger.js';

// ============================================================================
// SENSITIVE FIELD DEFINITIONS
// ============================================================================

/**
 * Define which fields should be encrypted for each table/model
 */
export const ENCRYPTED_FIELDS = {
  // Users table
  users: [
    'email', // Email addresses (also create hash for searching)
    'phone', // Phone numbers
    'ssn', // Social Security Number
    'dateOfBirth', // Date of birth
    'address', // Physical address
  ],
  
  // Candidates table
  candidates: [
    'email',
    'phone',
    'ssn',
    'dateOfBirth',
    'address',
    'emergencyContact', // Emergency contact information
    'bankAccount', // Banking information
  ],
  
  // Interviews table
  interviews: [
    'notes', // Interview notes may contain PII
    'feedback', // Feedback may contain sensitive information
  ],
  
  // Documents table
  documents: [
    'content', // Document content (if stored in DB)
  ],
  
  // Payments table
  payments: [
    'cardNumber', // Credit card number (PCI compliance)
    'accountNumber', // Bank account number
    'routingNumber', // Bank routing number
  ],
};

/**
 * Fields that should also have a searchable hash
 * These fields will have a corresponding _hash column for searching
 */
export const SEARCHABLE_FIELDS = {
  users: ['email', 'ssn'],
  candidates: ['email', 'ssn'],
  payments: ['cardNumber', 'accountNumber'],
};

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt sensitive fields in a database row
 * 
 * @param {string} table - Table name
 * @param {Object} data - Row data
 * @returns {Object} Data with encrypted fields
 */
export function encryptRow(table, data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const fields = ENCRYPTED_FIELDS[table] || [];
  const searchableFields = SEARCHABLE_FIELDS[table] || [];
  
  const encrypted = { ...data };
  
  // Encrypt each field
  for (const field of fields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      const value = String(encrypted[field]);
      
      // Skip if already encrypted
      if (encryption.isEncrypted(value)) {
        continue;
      }
      
      // Encrypt the field
      encrypted[field] = encryption.encrypt(value);
      
      // Create searchable hash if needed
      if (searchableFields.includes(field)) {
        const hashField = `${field}_hash`;
        encrypted[hashField] = encryption.hash(value);
      }
    }
  }
  
  return encrypted;
}

/**
 * Decrypt sensitive fields in a database row
 * 
 * @param {string} table - Table name
 * @param {Object} data - Row data with encrypted fields
 * @returns {Object} Data with decrypted fields
 */
export function decryptRow(table, data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const fields = ENCRYPTED_FIELDS[table] || [];
  const decrypted = { ...data };
  
  // Decrypt each field
  for (const field of fields) {
    if (decrypted[field]) {
      try {
        decrypted[field] = encryption.decrypt(decrypted[field]);
      } catch (error) {
        logger.warn(`Failed to decrypt field ${table}.${field}`, {
          error: error.message,
          fieldLength: decrypted[field]?.length,
        });
        // Keep encrypted value if decryption fails
      }
    }
  }
  
  // Remove hash fields from output
  const searchableFields = SEARCHABLE_FIELDS[table] || [];
  for (const field of searchableFields) {
    const hashField = `${field}_hash`;
    delete decrypted[hashField];
  }
  
  return decrypted;
}

/**
 * Encrypt multiple rows
 * 
 * @param {string} table - Table name
 * @param {Array<Object>} rows - Array of row data
 * @returns {Array<Object>} Array with encrypted fields
 */
export function encryptRows(table, rows) {
  if (!Array.isArray(rows)) {
    return rows;
  }
  
  return rows.map(row => encryptRow(table, row));
}

/**
 * Decrypt multiple rows
 * 
 * @param {string} table - Table name
 * @param {Array<Object>} rows - Array of row data with encrypted fields
 * @returns {Array<Object>} Array with decrypted fields
 */
export function decryptRows(table, rows) {
  if (!Array.isArray(rows)) {
    return rows;
  }
  
  return rows.map(row => decryptRow(table, row));
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to encrypt data before saving to database
 * 
 * @param {string} table - Table name
 * @returns {Function} Middleware function
 */
export function encryptBeforeSave(table) {
  return async (data) => {
    try {
      return encryptRow(table, data);
    } catch (error) {
      logger.error('Encryption before save failed', {
        table,
        error: error.message,
      });
      throw error;
    }
  };
}

/**
 * Middleware to decrypt data after loading from database
 * 
 * @param {string} table - Table name
 * @returns {Function} Middleware function
 */
export function decryptAfterLoad(table) {
  return async (data) => {
    try {
      if (Array.isArray(data)) {
        return decryptRows(table, data);
      }
      return decryptRow(table, data);
    } catch (error) {
      logger.error('Decryption after load failed', {
        table,
        error: error.message,
      });
      throw error;
    }
  };
}

// ============================================================================
// SEARCH HELPERS
// ============================================================================

/**
 * Generate search hash for encrypted field
 * 
 * @param {string} table - Table name
 * @param {string} field - Field name
 * @param {string} value - Value to hash
 * @returns {string|null} Hash or null if field is not searchable
 */
export function generateSearchHash(table, field, value) {
  const searchableFields = SEARCHABLE_FIELDS[table] || [];
  
  if (!searchableFields.includes(field)) {
    return null;
  }
  
  return encryption.hash(value);
}

/**
 * Build WHERE clause for searching encrypted field
 * 
 * @param {string} table - Table name
 * @param {string} field - Field name
 * @param {string} value - Search value
 * @returns {Object} WHERE clause object
 */
export function buildEncryptedSearchQuery(table, field, value) {
  const hash = generateSearchHash(table, field, value);
  
  if (!hash) {
    throw new Error(
      `Field ${field} in table ${table} is not configured for searching`
    );
  }
  
  const hashField = `${field}_hash`;
  
  return {
    [hashField]: hash,
  };
}

// ============================================================================
// KEY ROTATION
// ============================================================================

/**
 * Re-encrypt a row with a new encryption key
 * 
 * @param {string} table - Table name
 * @param {Object} data - Row data with encrypted fields
 * @param {string} oldKey - Old encryption key
 * @param {string} newKey - New encryption key
 * @returns {Object} Data re-encrypted with new key
 */
export function rotateRowEncryption(table, data, oldKey, newKey) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const fields = ENCRYPTED_FIELDS[table] || [];
  const rotated = { ...data };
  
  for (const field of fields) {
    if (rotated[field]) {
      try {
        rotated[field] = encryption.rotateEncryption(
          rotated[field],
          oldKey,
          newKey
        );
      } catch (error) {
        logger.error(`Failed to rotate encryption for ${table}.${field}`, {
          error: error.message,
        });
        throw error;
      }
    }
  }
  
  return rotated;
}

/**
 * Re-encrypt all rows in a table with a new key
 * 
 * @param {Object} db - Database connection
 * @param {string} table - Table name
 * @param {string} oldKey - Old encryption key
 * @param {string} newKey - New encryption key
 * @returns {Promise<number>} Number of rows rotated
 */
export async function rotateTableEncryption(db, table, oldKey, newKey) {
  try {
    logger.info(`Starting encryption rotation for table: ${table}`);
    
    // Get all rows (this should be done in batches for large tables)
    const rows = await db.query(`SELECT * FROM ${table}`);
    
    let rotatedCount = 0;
    
    // Rotate encryption for each row
    for (const row of rows) {
      const rotated = rotateRowEncryption(table, row, oldKey, newKey);
      
      // Update the row
      const updateFields = Object.keys(rotated)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      
      const updateValues = Object.values(rotated);
      
      await db.query(
        `UPDATE ${table} SET ${updateFields} WHERE id = $1`,
        [row.id, ...updateValues]
      );
      
      rotatedCount++;
    }
    
    logger.info(`Completed encryption rotation for table: ${table}`, {
      rowsRotated: rotatedCount,
    });
    
    return rotatedCount;
  } catch (error) {
    logger.error(`Encryption rotation failed for table: ${table}`, {
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrate existing unencrypted data to encrypted format
 * 
 * @param {Object} db - Database connection
 * @param {string} table - Table name
 * @param {number} [batchSize=100] - Number of rows to process at once
 * @returns {Promise<number>} Number of rows migrated
 */
export async function migrateToEncryption(db, table, batchSize = 100) {
  try {
    logger.info(`Starting encryption migration for table: ${table}`);
    
    const fields = ENCRYPTED_FIELDS[table] || [];
    const searchableFields = SEARCHABLE_FIELDS[table] || [];
    
    if (fields.length === 0) {
      logger.warn(`No encrypted fields configured for table: ${table}`);
      return 0;
    }
    
    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) FROM ${table}`);
    const totalRows = parseInt(countResult[0].count, 10);
    
    let migratedCount = 0;
    let offset = 0;
    
    // Process in batches
    while (offset < totalRows) {
      const rows = await db.query(
        `SELECT * FROM ${table} LIMIT ${batchSize} OFFSET ${offset}`
      );
      
      for (const row of rows) {
        const encrypted = { ...row };
        let needsUpdate = false;
        
        // Check each field
        for (const field of fields) {
          if (
            encrypted[field] &&
            !encryption.isEncrypted(encrypted[field])
          ) {
            // Field is not encrypted, encrypt it
            const value = String(encrypted[field]);
            encrypted[field] = encryption.encrypt(value);
            needsUpdate = true;
            
            // Create searchable hash if needed
            if (searchableFields.includes(field)) {
              const hashField = `${field}_hash`;
              encrypted[hashField] = encryption.hash(value);
            }
          }
        }
        
        // Update row if any field was encrypted
        if (needsUpdate) {
          const updateFields = [];
          const updateValues = [];
          let paramIndex = 2;
          
          for (const field of fields) {
            updateFields.push(`${field} = $${paramIndex}`);
            updateValues.push(encrypted[field]);
            paramIndex++;
            
            // Add hash field if it exists
            if (searchableFields.includes(field)) {
              const hashField = `${field}_hash`;
              if (encrypted[hashField]) {
                updateFields.push(`${hashField} = $${paramIndex}`);
                updateValues.push(encrypted[hashField]);
                paramIndex++;
              }
            }
          }
          
          await db.query(
            `UPDATE ${table} SET ${updateFields.join(', ')} WHERE id = $1`,
            [row.id, ...updateValues]
          );
          
          migratedCount++;
        }
      }
      
      offset += batchSize;
      
      logger.info(`Migration progress: ${offset}/${totalRows} rows processed`);
    }
    
    logger.info(`Completed encryption migration for table: ${table}`, {
      rowsMigrated: migratedCount,
      totalRows,
    });
    
    return migratedCount;
  } catch (error) {
    logger.error(`Encryption migration failed for table: ${table}`, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add hash columns for searchable encrypted fields
 * 
 * @param {Object} db - Database connection
 * @param {string} table - Table name
 * @returns {Promise<Array<string>>} Array of added column names
 */
export async function addHashColumns(db, table) {
  try {
    const searchableFields = SEARCHABLE_FIELDS[table] || [];
    const addedColumns = [];
    
    for (const field of searchableFields) {
      const hashField = `${field}_hash`;
      
      try {
        await db.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${hashField} VARCHAR(64)`
        );
        
        await db.query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_${hashField} ON ${table}(${hashField})`
        );
        
        addedColumns.push(hashField);
        
        logger.info(`Added hash column: ${table}.${hashField}`);
      } catch (error) {
        logger.warn(`Failed to add hash column: ${table}.${hashField}`, {
          error: error.message,
        });
      }
    }
    
    return addedColumns;
  } catch (error) {
    logger.error(`Failed to add hash columns for table: ${table}`, {
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ENCRYPTED_FIELDS,
  SEARCHABLE_FIELDS,
  encryptRow,
  decryptRow,
  encryptRows,
  decryptRows,
  encryptBeforeSave,
  decryptAfterLoad,
  generateSearchHash,
  buildEncryptedSearchQuery,
  rotateRowEncryption,
  rotateTableEncryption,
  migrateToEncryption,
  addHashColumns,
};
