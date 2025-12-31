import logger from './logger.js';

/**
 * File security validator
 * Validates files based on magic numbers (file signatures), not just extensions
 */

/**
 * Common file type signatures (magic numbers)
 * These are the first few bytes of files that identify their type
 */
const FILE_SIGNATURES = {
  // Documents
  pdf: {
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  docx: {
    signature: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP format)
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['.docx', '.xlsx', '.pptx'],
  },
  doc: {
    signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // Microsoft Office
    mimeTypes: ['application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'],
    extensions: ['.doc', '.xls', '.ppt'],
  },
  rtf: {
    signature: [0x7B, 0x5C, 0x72, 0x74, 0x66], // {\rtf
    mimeTypes: ['application/rtf', 'text/rtf'],
    extensions: ['.rtf'],
  },
  
  // Images
  jpeg: {
    signature: [0xFF, 0xD8, 0xFF],
    mimeTypes: ['image/jpeg'],
    extensions: ['.jpg', '.jpeg'],
  },
  png: {
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    mimeTypes: ['image/png'],
    extensions: ['.png'],
  },
  gif: {
    signature: [0x47, 0x49, 0x46, 0x38], // GIF8
    mimeTypes: ['image/gif'],
    extensions: ['.gif'],
  },
  webp: {
    signature: [0x52, 0x49, 0x46, 0x46], // RIFF (need to check WEBP at offset 8)
    mimeTypes: ['image/webp'],
    extensions: ['.webp'],
  },
  
  // Text
  txt: {
    signature: null, // Text files don't have magic numbers
    mimeTypes: ['text/plain'],
    extensions: ['.txt'],
  },
};

/**
 * Dangerous file extensions that should never be allowed
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
  '.vbs', '.vbe', '.ts', '.jse', '.wsf', '.wsh',
  '.msi', '.msp', '.dll', '.sys', '.drv',
  '.ps1', '.psm1', '.sh', '.bash',
  '.jar', '.war', '.ear',
  '.app', '.deb', '.rpm',
  '.dmg', '.pkg',
  '.iso', '.img',
];

/**
 * Check if file extension is dangerous
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if dangerous
 */
export function isDangerousExtension(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return DANGEROUS_EXTENSIONS.some(dangerous => dangerous === `.${ext}`);
}

/**
 * Validate file signature (magic number)
 * @param {Buffer} buffer - File buffer
 * @param {string} expectedType - Expected file type key
 * @returns {boolean} - True if signature matches
 */
export function validateFileSignature(buffer, expectedType) {
  const fileType = FILE_SIGNATURES[expectedType];
  
  if (!fileType) {
    logger.warn(`Unknown file type for validation: ${expectedType}`);
    return false;
  }
  
  // Text files don't have magic numbers
  if (fileType.signature === null) {
    return true;
  }
  
  // Check if buffer starts with expected signature
  const signature = fileType.signature;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Detect file type from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {string|null} - Detected file type key or null
 */
export function detectFileType(buffer) {
  for (const [type, info] of Object.entries(FILE_SIGNATURES)) {
    if (info.signature === null) continue;
    
    let matches = true;
    for (let i = 0; i < info.signature.length; i++) {
      if (buffer[i] !== info.signature[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      // Special case for WEBP (need to check WEBP signature at offset 8)
      if (type === 'webp') {
        const webpSignature = [0x57, 0x45, 0x42, 0x50]; // WEBP
        let webpMatches = true;
        for (let i = 0; i < webpSignature.length; i++) {
          if (buffer[8 + i] !== webpSignature[i]) {
            webpMatches = false;
            break;
          }
        }
        if (!webpMatches) continue;
      }
      
      return type;
    }
  }
  
  return null;
}

/**
 * Validate file upload security
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
export function validateFileUploadSecurity({
  buffer,
  filename,
  mimeType,
  size,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['pdf', 'docx', 'doc', 'txt'],
  organizationId,
}) {
  const result = {
    valid: false,
    errors: [],
    warnings: [],
    metadata: {
      filename,
      mimeType,
      size,
      detectedType: null,
    },
  };
  
  try {
    // 1. Check filename for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      result.errors.push('Filename contains invalid characters (path traversal attempt)');
      return result;
    }
    
    // 2. Check for dangerous extensions
    if (isDangerousExtension(filename)) {
      result.errors.push('File type is not allowed (dangerous extension)');
      return result;
    }
    
    // 3. Check file size
    if (size > maxSize) {
      result.errors.push(`File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024)}MB`);
      return result;
    }
    
    // 4. Check minimum file size (avoid empty files)
    if (size < 10) {
      result.errors.push('File is too small (possible empty file)');
      return result;
    }
    
    // 5. Detect actual file type from magic number
    const detectedType = detectFileType(buffer);
    result.metadata.detectedType = detectedType;
    
    if (!detectedType) {
      // For text files, allow if explicitly in allowed types
      if (allowedTypes.includes('txt') && mimeType === 'text/plain') {
        result.metadata.detectedType = 'txt';
      } else {
        result.errors.push('Unable to detect file type (corrupted or unsupported format)');
        return result;
      }
    }
    
    // 6. Check if detected type is in allowed types
    if (!allowedTypes.includes(result.metadata.detectedType)) {
      result.errors.push(`File type ${result.metadata.detectedType} is not allowed`);
      return result;
    }
    
    // 7. Validate file signature matches expected type
    const fileTypeInfo = FILE_SIGNATURES[result.metadata.detectedType];
    if (!validateFileSignature(buffer, result.metadata.detectedType)) {
      result.errors.push('File signature does not match declared type (possible file spoofing)');
      return result;
    }
    
    // 8. Verify MIME type matches detected type
    if (!fileTypeInfo.mimeTypes.includes(mimeType)) {
      result.warnings.push(`MIME type ${mimeType} does not match detected type ${result.metadata.detectedType}`);
    }
    
    // 9. Verify file extension matches detected type
    const fileExt = `.${filename.toLowerCase().split('.').pop()}`;
    if (!fileTypeInfo.extensions.includes(fileExt)) {
      result.warnings.push(`File extension ${fileExt} does not match detected type ${result.metadata.detectedType}`);
    }
    
    // 10. Check for embedded executables (ZIP-based formats)
    if (['docx', 'xlsx', 'pptx'].includes(result.metadata.detectedType)) {
      // These are ZIP files, could contain executables
      result.warnings.push('Office document may contain macros or embedded content');
    }
    
    // 11. Organization-specific checks
    if (!organizationId) {
      result.warnings.push('No organization context provided');
    }
    
    // All checks passed
    result.valid = true;
    
    logger.info('File upload security validation passed', {
      filename,
      detectedType: result.metadata.detectedType,
      size,
      warnings: result.warnings.length,
    });
    
    return result;
  } catch (_error) {
    logger.error('File security validation error:', {
      error: error.message,
      filename,
    });
    
    result.errors.push('Internal validation error');
    return result;
  }
}

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  // Remove any path components
  let safe = filename.split(/[/\\]/).pop();
  
  // Replace unsafe characters with underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Remove multiple consecutive underscores
  safe = safe.replace(/_+/g, '_');
  
  // Limit filename length (keep extension)
  const parts = safe.split('.');
  const ext = parts.length > 1 ? '.' + parts.pop() : '';
  let name = parts.join('.');
  
  if (name.length > 200) {
    name = name.substring(0, 200);
  }
  
  return name + ext;
}

/**
 * Get allowed file types configuration
 * @param {string} context - Upload context (resume, document, avatar, etc.)
 * @returns {object} - Configuration for allowed types
 */
export function getAllowedFileTypes(context) {
  const configs = {
    resume: {
      types: ['pdf', 'doc', 'docx', 'txt'],
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'PDF, Word document, or text file',
    },
    document: {
      types: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'PDF, Word document, RTF, or text file',
    },
    avatar: {
      types: ['jpeg', 'png', 'gif', 'webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'JPEG, PNG, GIF, or WebP image',
    },
    attachment: {
      types: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'jpeg', 'png'],
      maxSize: 25 * 1024 * 1024, // 25MB
      description: 'Document or image file',
    },
  };
  
  return configs[context] || configs.document;
}

export default {
  validateFileUploadSecurity,
  validateFileSignature,
  detectFileType,
  isDangerousExtension,
  sanitizeFilename,
  getAllowedFileTypes,
  FILE_SIGNATURES,
  DANGEROUS_EXTENSIONS,
};
