# File Upload Security Guide

## Overview

This document outlines the comprehensive file upload security measures implemented in the RecruitIQ backend to protect against malicious file uploads, including virus scanning, file type validation, secure storage, and more.

## Security Features

### 1. **Multi-Layer Validation**

- **Extension Blocking**: Dangerous extensions (.exe, .bat, .ps1, etc.) are automatically rejected
- **Magic Number Verification**: Files are validated by their binary signature, not just extension
- **MIME Type Validation**: Content-Type headers are verified against detected file types
- **File Size Limits**: Configurable size limits per upload context
- **Path Traversal Prevention**: Filenames are sanitized to prevent directory traversal attacks

### 2. **Virus Scanning**

- **ClamAV Integration**: Production-ready virus scanning with ClamAV
- **Real-time Scanning**: Files are scanned before storage
- **Fail-Safe Approach**: Files are rejected if scanning fails
- **Mock Scanner**: Testing mode for development environments

### 3. **Secure Storage**

- **UUID-Based Naming**: Files are renamed with UUIDs to prevent collisions and attacks
- **Organized Structure**: Files are stored in `orgId/year/month/` hierarchy
- **Dual Storage Support**: Local filesystem or AWS S3 with encryption
- **File Integrity**: SHA-256 hashes calculated for verification
- **Metadata Tracking**: Upload metadata stored separately from files

### 4. **Access Control**

- **Organization Isolation**: Files are namespaced by organization ID
- **Signed URLs**: Temporary access URLs for S3 (expires in 1 hour by default)
- **Authentication Required**: All uploads require valid JWT tokens
- **Audit Logging**: All upload attempts are logged with user/IP information

## File Type Support

### Supported File Types

#### **Documents**
- PDF (`.pdf`) - Resume, contracts, documents
- Microsoft Word (`.doc`, `.docx`) - Documents
- Rich Text Format (`.rtf`) - Formatted text
- Plain Text (`.txt`) - Simple text files

#### **Images** (for avatars, profile pictures)
- JPEG (`.jpg`, `.jpeg`) - Photos
- PNG (`.png`) - Graphics, screenshots
- GIF (`.gif`) - Animated images
- WebP (`.webp`) - Modern image format

### Upload Contexts

Different contexts have different allowed file types and size limits:

| Context | Allowed Types | Max Size | Use Case |
|---------|--------------|----------|----------|
| `resume` | PDF, DOC, DOCX, TXT | 10 MB | Candidate resumes |
| `document` | PDF, DOC, DOCX, TXT, RTF | 10 MB | General documents |
| `avatar` | JPEG, PNG, GIF, WebP | 5 MB | Profile pictures |
| `attachment` | PDF, DOC, DOCX, TXT, RTF, JPEG, PNG | 25 MB | Email attachments |

## Implementation Guide

### Basic Upload Endpoint

```javascript
import { secureUploadPipeline } from '../middleware/fileUpload.js';
import fileStorage from '../utils/fileStorage.js';
import { requireAuth } from '../middleware/auth.js';

// Simple single file upload
router.post('/upload/resume',
  requireAuth,
  ...secureUploadPipeline({ 
    context: 'resume', 
    fieldName: 'file',
    multiple: false 
  }),
  async (req, res) => {
    try {
      const file = req.file;
      
      // Upload to storage
      const uploadResult = await fileStorage.upload({
        buffer: file.buffer,
        originalFilename: file.originalname,
        contentType: file.mimetype,
        organizationId: req.user.organization_id,
        userId: req.user.id,
      });
      
      // Save metadata to database
      await db.query(
        `INSERT INTO file_uploads 
         (secure_path, original_name, file_hash, size, content_type, 
          uploaded_by, organization_id, context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uploadResult.securePath,
          uploadResult.originalName,
          uploadResult.fileHash,
          uploadResult.size,
          uploadResult.contentType,
          req.user.id,
          req.user.organization_id,
          'resume'
        ]
      );
      
      res.json({
        success: true,
        file: {
          name: uploadResult.originalName,
          size: uploadResult.size,
          type: uploadResult.contentType,
          uploadedAt: uploadResult.uploadedAt,
        },
      });
    } catch (error) {
      logger.error('File upload failed:', error);
      res.status(500).json({
        error: 'Upload Failed',
        message: 'Failed to upload file',
      });
    }
  }
);
```

### Multiple Files Upload

```javascript
router.post('/upload/documents',
  requireAuth,
  ...secureUploadPipeline({ 
    context: 'document', 
    fieldName: 'files',
    multiple: true 
  }),
  async (req, res) => {
    try {
      const files = req.files;
      const uploadResults = [];
      
      for (const file of files) {
        const uploadResult = await fileStorage.upload({
          buffer: file.buffer,
          originalFilename: file.originalname,
          contentType: file.mimetype,
          organizationId: req.user.organization_id,
          userId: req.user.id,
        });
        
        uploadResults.push(uploadResult);
      }
      
      res.json({
        success: true,
        files: uploadResults.map(r => ({
          name: r.originalName,
          size: r.size,
        })),
      });
    } catch (error) {
      logger.error('Multiple file upload failed:', error);
      res.status(500).json({
        error: 'Upload Failed',
        message: 'Failed to upload files',
      });
    }
  }
);
```

### Manual Validation (for base64 uploads)

```javascript
import { validateFileUploadSecurity, getAllowedFileTypes } from '../utils/fileValidator.js';

router.post('/upload/base64', requireAuth, async (req, res) => {
  try {
    const { filename, contentType, data } = req.body;
    
    // Decode base64
    const buffer = Buffer.from(data, 'base64');
    
    // Validate security
    const config = getAllowedFileTypes('resume');
    const validation = validateFileUploadSecurity({
      buffer,
      filename,
      mimeType: contentType,
      size: buffer.length,
      maxSize: config.maxSize,
      allowedTypes: config.types,
      organizationId: req.user.organization_id,
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid File',
        message: validation.errors[0],
        details: validation.errors,
      });
    }
    
    // Scan for viruses
    const scanResult = await virusScanner.scanBuffer(buffer, filename);
    if (!scanResult.clean) {
      return res.status(400).json({
        error: 'Malicious File',
        message: scanResult.message,
      });
    }
    
    // Upload to storage
    const uploadResult = await fileStorage.upload({
      buffer,
      originalFilename: filename,
      contentType,
      organizationId: req.user.organization_id,
      userId: req.user.id,
    });
    
    res.json({
      success: true,
      file: uploadResult,
    });
  } catch (error) {
    logger.error('Base64 upload failed:', error);
    res.status(500).json({
      error: 'Upload Failed',
      message: 'Failed to process file',
    });
  }
});
```

## File Retrieval

### Secure Download Endpoint

```javascript
router.get('/files/:fileId/download',
  requireAuth,
  async (req, res) => {
    try {
      const { fileId } = req.params;
      
      // Get file metadata from database
      const result = await db.query(
        `SELECT * FROM file_uploads 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [fileId, req.user.organization_id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'File not found',
        });
      }
      
      const fileMetadata = result.rows[0];
      
      // Get file from storage
      if (fileStorage.storageType === 's3') {
        // Generate signed URL for S3
        const signedUrl = await fileStorage.getSignedUrl(
          fileMetadata.secure_path,
          3600 // 1 hour
        );
        
        return res.json({
          success: true,
          downloadUrl: signedUrl,
          expiresIn: 3600,
        });
      } else {
        // Stream file from local storage
        const buffer = await fileStorage.retrieve(fileMetadata.secure_path);
        
        res.set({
          'Content-Type': fileMetadata.content_type,
          'Content-Disposition': `attachment; filename="${fileMetadata.original_name}"`,
          'Content-Length': buffer.length,
        });
        
        res.send(buffer);
      }
      
      // Log download
      logger.info('File downloaded', {
        fileId,
        userId: req.user.id,
        filename: fileMetadata.original_name,
      });
    } catch (error) {
      logger.error('File download failed:', error);
      res.status(500).json({
        error: 'Download Failed',
        message: 'Failed to retrieve file',
      });
    }
  }
);
```

## Configuration

### Environment Variables

```bash
# File Storage
FILE_STORAGE_TYPE=local          # 'local' or 's3'
FILE_STORAGE_PATH=/app/storage   # Local storage path

# AWS S3 (if using S3 storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=recruitiq-uploads
AWS_S3_BUCKET_REGION=us-east-1

# Virus Scanning
VIRUS_SCANNING_ENABLED=true      # Enable/disable virus scanning
VIRUS_SCANNER_TYPE=clamav        # 'clamav' or 'mock'
CLAMAV_PATH=/usr/bin/clamscan    # Path to clamscan binary
TEMP_DIR=/tmp                    # Temporary directory for scanning

# Feature Flags
ENABLE_FILE_UPLOADS=true         # Master switch for file uploads
```

### Install ClamAV (Production)

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo freshclam  # Update virus definitions
sudo systemctl start clamav-daemon
```

#### macOS
```bash
brew install clamav
freshclam
```

#### Docker
```dockerfile
FROM node:18-alpine

# Install ClamAV
RUN apk add --no-cache clamav clamav-libunrar
RUN freshclam

# ... rest of Dockerfile
```

## Security Best Practices

### 1. **Never Trust User Input**

- Always validate on the server side
- Don't rely on client-side validation
- Verify file content, not just extensions

### 2. **Limit File Sizes**

```javascript
// Set appropriate limits per context
const limits = {
  resume: 10 * 1024 * 1024,    // 10 MB
  avatar: 5 * 1024 * 1024,     // 5 MB
  document: 25 * 1024 * 1024,  // 25 MB
};
```

### 3. **Store Files Outside Web Root**

```javascript
// ❌ Bad: Files accessible via direct URL
const storagePath = '/var/www/public/uploads';

// ✅ Good: Files not directly accessible
const storagePath = '/var/app/storage/uploads';
```

### 4. **Use Content Security Policy**

```javascript
// In helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      objectSrc: ["'none'"],  // Prevent Flash/Java execution
      // ... other directives
    },
  },
}));
```

### 5. **Implement Rate Limiting**

```javascript
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many file uploads, please try again later',
});

router.post('/upload', uploadLimiter, ...uploadMiddleware);
```

### 6. **Scan with Multiple Tools (Defense in Depth)**

```javascript
// Consider adding multiple scan layers
- ClamAV for virus detection
- YARA rules for malware patterns
- ML-based content analysis
- Hash-based reputation checking
```

### 7. **Monitor and Alert**

```javascript
// Log all upload attempts
logger.info('File upload', {
  userId,
  filename,
  size,
  detectedType,
  ip,
  timestamp,
});

// Alert on suspicious activity
if (failedUploadsInLastHour > 10) {
  alertSecurityTeam('Suspicious upload activity detected');
}
```

## Attack Prevention

### Path Traversal

```javascript
// ✅ Handled by sanitizeFilename()
'../../../etc/passwd' → '______etc_passwd'
```

### File Extension Spoofing

```javascript
// ✅ Handled by magic number validation
'virus.exe.pdf' → Rejected (EXE signature detected)
```

### Polyglot Files

```javascript
// ✅ Handled by strict magic number checking
// Files that are valid as multiple types are flagged
```

### Zip Bombs

```javascript
// ✅ Handled by size limits
// Compressed files are rejected if they exceed limits
```

### Embedded Executables

```javascript
// ✅ Warned in validation
// Office documents flagged as potentially containing macros
```

## Testing

### Unit Tests

```javascript
import { validateFileUploadSecurity, detectFileType } from '../utils/fileValidator.js';

describe('File Validator', () => {
  it('should detect PDF files correctly', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    const type = detectFileType(pdfBuffer);
    expect(type).toBe('pdf');
  });
  
  it('should reject dangerous extensions', () => {
    const result = validateFileUploadSecurity({
      buffer: Buffer.from('test'),
      filename: 'malware.exe',
      mimeType: 'application/octet-stream',
      size: 1000,
      allowedTypes: ['pdf'],
    });
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```javascript
import request from 'supertest';
import app from '../app.js';

describe('File Upload API', () => {
  it('should upload valid PDF', async () => {
    const response = await request(app)
      .post('/api/upload/resume')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', './test/fixtures/valid-resume.pdf')
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
  
  it('should reject executable files', async () => {
    const response = await request(app)
      .post('/api/upload/resume')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', './test/fixtures/malware.exe')
      .expect(400);
    
    expect(response.body.error).toContain('not allowed');
  });
});
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Upload Success Rate**: Successful uploads / Total attempts
2. **Rejected Files**: Count and reasons for rejection
3. **Virus Detections**: Files flagged by virus scanner
4. **Storage Usage**: Total bytes stored per organization
5. **Average File Size**: Track trends over time
6. **Failed Scans**: Virus scanner errors or failures

### Logging Events

- All upload attempts (success and failure)
- Validation failures with reasons
- Virus detections with file details
- Storage operations (upload, delete, retrieve)
- Signed URL generations
- Error conditions and exceptions

## Troubleshooting

### Common Issues

#### "Unable to verify file safety"
- **Cause**: Virus scanner is not available
- **Solution**: Install ClamAV or set `VIRUS_SCANNING_ENABLED=false` for development

#### "File signature does not match"
- **Cause**: File extension doesn't match actual content
- **Solution**: Upload the correct file type or adjust allowed types

#### "AWS S3 upload failed"
- **Cause**: Invalid AWS credentials or permissions
- **Solution**: Verify `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and S3 bucket permissions

#### "File size exceeds maximum"
- **Cause**: File is larger than configured limit
- **Solution**: Compress file or adjust `maxSize` configuration

## Migration Guide

### From Base64 Storage to File Storage

If you're currently storing files as base64 in the database:

```javascript
// Migration script
async function migrateFilesToStorage() {
  const candidates = await db.query(
    'SELECT id, application_data FROM candidates WHERE application_data IS NOT NULL'
  );
  
  for (const candidate of candidates.rows) {
    const data = candidate.application_data;
    
    if (data.resume && data.resume.data) {
      // Decode base64
      const buffer = Buffer.from(data.resume.data, 'base64');
      
      // Upload to new storage
      const uploadResult = await fileStorage.upload({
        buffer,
        originalFilename: data.resume.filename,
        contentType: data.resume.contentType,
        organizationId: candidate.organization_id,
        userId: candidate.created_by,
      });
      
      // Update database with new reference
      data.resume = {
        securePath: uploadResult.securePath,
        originalName: uploadResult.originalName,
        size: uploadResult.size,
        hash: uploadResult.fileHash,
      };
      
      await db.query(
        'UPDATE candidates SET application_data = $1 WHERE id = $2',
        [JSON.stringify(data), candidate.id]
      );
    }
  }
}
```

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
