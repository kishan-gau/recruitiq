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
 * Allowed tables for encryption operations (SQL injection prevention)
 * Only these table names are permitted in dynamic queries
 */
const ALLOWED_TABLES = [
  'users',
  'candidates',
  'interviews',
  'documents',
  'payments',
];

/**
 * Validate table name against whitelist
 * Prevents SQL injection via table name parameter
 * 
 * @param {string} table - Table name to validate
 * @returns {string} Validated table name
 * @throws {Error} If table name is not in whitelist
 */
function validateTableName(table) {
  if (!table || typeof table !== 'string') {
    throw new Error('Invalid table name: must be a non-empty string');
  }
  
  // Strict whitelist validation
  if (!ALLOWED_TABLES.includes(table)) {
    logger.error('Attempted access to non-whitelisted table', { 
      table,
      allowedTables: ALLOWED_TABLES 
    });
    throw new Error(`Invalid table name: ${table}. Table not in whitelist.`);
  }
  
  // Additional validation: alphanumeric and underscore only
  if (!/^[a-z_]+$/.test(table)) {
    throw new Error('Invalid table name format: only lowercase letters and underscores allowed');
  }
  
  return table;
}

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
    // SQL Injection Prevention: Validate table name against whitelist
    const validatedTable = validateTableName(table);
    
    logger.info(`Starting encryption rotation for table: ${validatedTable}`);
    
    // Get all rows (this should be done in batches for large tables)
    // Using validated table name in parameterized context
    const rows = await db.query(`SELECT * FROM ${validatedTable}`);
    
    let rotatedCount = 0;
    
    // Rotate encryption for each row
    for (const row of rows) {
      const rotated = rotateRowEncryption(validatedTable, row, oldKey, newKey);
      
      // Get encrypted field names for this table
      const fields = ENCRYPTED_FIELDS[validatedTable] || [];
      const searchableFields = SEARCHABLE_FIELDS[validatedTable] || [];
      
      // Build parameterized UPDATE query with only encrypted fields
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 2;
      
      for (const field of fields) {
        if (rotated[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(rotated[field]);
          paramIndex++;
          
          // Add hash field if searchable
          if (searchableFields.includes(field)) {
            const hashField = `${field}_hash`;
            if (rotated[hashField]) {
              updateFields.push(`${hashField} = $${paramIndex}`);
              updateValues.push(rotated[hashField]);
              paramIndex++;
            }
          }
        }
      }
      
      if (updateFields.length > 0) {
        await db.query(
          `UPDATE ${validatedTable} SET ${updateFields.join(', ')} WHERE id = $1`,
          [row.id, ...updateValues]
        );
      }
      
      rotatedCount++;
    }
    
    logger.info(`Completed encryption rotation for table: ${validatedTable}`, {
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
    // SQL Injection Prevention: Validate table name against whitelist
    const validatedTable = validateTableName(table);
    
    logger.info(`Starting encryption migration for table: ${validatedTable}`);
    
    const fields = ENCRYPTED_FIELDS[validatedTable] || [];
    const searchableFields = SEARCHABLE_FIELDS[validatedTable] || [];
    
    if (fields.length === 0) {
      logger.warn(`No encrypted fields configured for table: ${validatedTable}`);
      return 0;
    }
    
    // Validate batch size to prevent DoS
    const validatedBatchSize = Math.min(Math.max(1, parseInt(batchSize, 10)), 1000);
    
    // Get total count using parameterized query
    const countResult = await db.query(`SELECT COUNT(*) as count FROM ${validatedTable}`);
    const totalRows = parseInt(countResult.rows[0].count, 10);
    
    let migratedCount = 0;
    let offset = 0;
    
    // Process in batches
    while (offset < totalRows) {
      // Using parameterized query for LIMIT and OFFSET
      const rows = await db.query(
        `SELECT * FROM ${validatedTable} ORDER BY id LIMIT $1 OFFSET $2`,
        [validatedBatchSize, offset]
      );
      
      for (const row of rows.rows) {
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
            `UPDATE ${validatedTable} SET ${updateFields.join(', ')} WHERE id = $1`,
            [row.id, ...updateValues]
          );
          
          migratedCount++;
        }
      }
      
      offset += validatedBatchSize;
      
      logger.info(`Migration progress: ${offset}/${totalRows} rows processed`);
    }
    
    logger.info(`Completed encryption migration for table: ${validatedTable}`, {
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
    // SQL Injection Prevention: Validate table name against whitelist
    const validatedTable = validateTableName(table);
    
    const searchableFields = SEARCHABLE_FIELDS[validatedTable] || [];
    const addedColumns = [];
    
    for (const field of searchableFields) {
      // Validate field name (only alphanumeric and underscore)
      if (!/^[a-z_][a-z0-9_]*$/i.test(field)) {
        logger.warn(`Invalid field name skipped: ${field}`);
        continue;
      }
      
      const hashField = `${field}_hash`;
      
      try {
        // Using validated identifiers in DDL statements
        await db.query(
          `ALTER TABLE ${validatedTable} ADD COLUMN IF NOT EXISTS ${hashField} VARCHAR(64)`
        );
        
        await db.query(
          `CREATE INDEX IF NOT EXISTS idx_${validatedTable}_${hashField} ON ${validatedTable}(${hashField})`
        );
        
        addedColumns.push(hashField);
        
        logger.info(`Added hash column: ${validatedTable}.${hashField}`);
      } catch (error) {
        logger.warn(`Failed to add hash column: ${validatedTable}.${hashField}`, {
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
