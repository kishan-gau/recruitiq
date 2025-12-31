import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { validateFileUploadSecurity, getAllowedFileTypes, sanitizeFilename } from '../utils/fileValidator.js';
import virusScanner from '../utils/virusScanner.js';

/**
 * Secure file upload middleware using Multer
 * Includes validation, virus scanning, and secure storage
 */

/**
 * Create secure multer configuration
 * @param {object} options - Configuration options
 * @returns {object} - Multer instance and error handler
 */
export function createSecureUpload(options = {}) {
  const {
    context = 'document', // resume, document, avatar, attachment
    fieldName = 'file',
    multiple = false,
    maxFiles = 5,
  } = options;

  const allowedConfig = getAllowedFileTypes(context);

  // Use memory storage for security validation before saving
  const storage = multer.memoryStorage();

  // File filter for initial validation
  const fileFilter = (req, file, cb) => {
    try {
      // Log upload attempt
      logger.info('File upload attempt', {
        fieldName: file.fieldname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        userId: req.user?.id,
        organizationId: req.user?.organization_id,
        ip: req.ip,
        path: req.path,
      });

      // Sanitize filename
      const sanitized = sanitizeFilename(file.originalname);
      file.originalname = sanitized;

      // Basic validation before buffer is available
      if (!file.originalname || file.originalname.length === 0) {
        cb(new Error('Invalid filename'));
        return;
      }

      // Check file size will be done by multer limits
      cb(null, true);
    } catch (_error) {
      logger.error('File filter error:', {
        error: error.message,
        filename: file.originalname,
      });
      cb(error);
    }
  };

  // Multer configuration
  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: allowedConfig.maxSize,
      files: multiple ? maxFiles : 1,
      fields: 10, // Limit number of non-file fields
      fieldNameSize: 100, // Limit field name size
      fieldSize: 1 * 1024 * 1024, // 1MB limit for field values
    },
  });

  // Create upload handler
  const handler = multiple 
    ? upload.array(fieldName, maxFiles)
    : upload.single(fieldName);

  return {
    handler,
    context,
    allowedConfig,
  };
}

/**
 * Middleware to validate uploaded file security
 * Must be used after multer middleware
 */
export function validateUploadSecurity(context = 'document') {
  const allowedConfig = getAllowedFileTypes(context);

  return async (req, res, next) => {
    try {
      // Check if file was uploaded
      const files = req.files || (req.file ? [req.file] : []);
      
      if (files.length === 0) {
        return next();
      }

      // Validate each file
      const validationResults = [];
      
      for (const file of files) {
        const result = validateFileUploadSecurity({
          buffer: file.buffer,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          maxSize: allowedConfig.maxSize,
          allowedTypes: allowedConfig.types,
          organizationId: req.user?.organization_id,
        });

        validationResults.push({
          file: file.originalname,
          ...result,
        });

        if (!result.valid) {
          logger.warn('File upload security validation failed', {
            filename: file.originalname,
            errors: result.errors,
            userId: req.user?.id,
            ip: req.ip,
          });

          return res.status(400).json({
            error: 'Invalid File',
            message: result.errors[0] || 'File failed security validation',
            details: {
              filename: file.originalname,
              errors: result.errors,
              warnings: result.warnings,
            },
          });
        }

        // Attach validation metadata to file object
        file.validationResult = result;
        file.detectedType = result.metadata.detectedType;
      }

      // Log successful validations
      logger.info('File upload security validation passed', {
        filesCount: files.length,
        validations: validationResults.map(v => ({
          file: v.file,
          type: v.metadata?.detectedType,
        })),
        userId: req.user?.id,
      });

      next();
    } catch (_error) {
      logger.error('Upload security validation error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      return res.status(500).json({
        error: 'Validation Error',
        message: 'Failed to validate file security',
      });
    }
  };
}

/**
 * Middleware to scan uploaded files for viruses
 * Must be used after multer middleware
 */
export function scanUploadedFiles() {
  return async (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      
      if (files.length === 0) {
        return next();
      }

      // Scan each file
      const scanResults = [];
      
      for (const file of files) {
        const scanResult = await virusScanner.scanBuffer(file.buffer, file.originalname);
        
        scanResults.push({
          file: file.originalname,
          ...scanResult,
        });

        if (!scanResult.clean) {
          logger.warn('File upload rejected: virus detected', {
            filename: file.originalname,
            scanResult,
            userId: req.user?.id,
            ip: req.ip,
          });

          return res.status(400).json({
            error: 'Malicious File Detected',
            message: scanResult.message || 'The uploaded file contains malicious content',
            details: {
              filename: file.originalname,
              scanner: scanResult.scanner,
            },
          });
        }

        // Attach scan result to file object
        file.scanResult = scanResult;
      }

      // Log successful scans
      logger.info('File virus scan completed', {
        filesCount: files.length,
        scans: scanResults.map(s => ({
          file: s.file,
          clean: s.clean,
          scanner: s.scanner,
        })),
        userId: req.user?.id,
      });

      next();
    } catch (_error) {
      logger.error('Virus scan middleware error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      // Fail safe: reject on error
      return res.status(500).json({
        error: 'Scan Error',
        message: 'Unable to verify file safety',
      });
    }
  };
}

/**
 * Multer error handler middleware
 */
export function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    logger.warn('Multer upload error', {
      code: err.code,
      message: err.message,
      field: err.field,
      userId: req.user?.id,
      ip: req.ip,
    });

    const errorMessages = {
      LIMIT_FILE_SIZE: 'File size exceeds maximum allowed size',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_FIELD_KEY: 'Field name is too long',
      LIMIT_FIELD_VALUE: 'Field value is too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_PART_COUNT: 'Too many parts in the request',
    };

    return res.status(400).json({
      error: 'Upload Error',
      message: errorMessages[err.code] || 'File upload failed',
      code: err.code,
    });
  }

  if (err) {
    logger.error('Upload error:', {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
      ip: req.ip,
    });

    return res.status(500).json({
      error: 'Upload Error',
      message: err.message || 'An error occurred during file upload',
    });
  }

  next();
}

/**
 * Create complete secure upload pipeline
 * @param {object} options - Configuration options
 * @returns {Array} - Array of middleware functions
 */
export function secureUploadPipeline(options = {}) {
  const { context = 'document', fieldName = 'file', multiple = false, skipVirusScan = false } = options;
  
  const { handler } = createSecureUpload({ context, fieldName, multiple });
  
  const pipeline = [
    handler,
    validateUploadSecurity(context),
  ];

  // Add virus scanning if not skipped
  if (!skipVirusScan) {
    pipeline.push(scanUploadedFiles());
  }

  // Add error handler
  pipeline.push(handleUploadErrors);

  return pipeline;
}

export default {
  createSecureUpload,
  validateUploadSecurity,
  scanUploadedFiles,
  handleUploadErrors,
  secureUploadPipeline,
};
