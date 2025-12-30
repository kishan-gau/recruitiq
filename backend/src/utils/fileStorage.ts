import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.ts';
import logger from './logger.ts';

/**
 * Secure file storage abstraction
 * Supports local filesystem and AWS S3
 */

class FileStorage {
  constructor() {
    this.storageType = config.features.fileUploads 
      ? (process.env.FILE_STORAGE_TYPE || 'local') 
      : 'local';
    
    this.localStoragePath = process.env.FILE_STORAGE_PATH || path.join(process.cwd(), 'storage', 'uploads');
    
    // Initialize S3 if configured
    if (this.storageType === 's3') {
      this.s3 = new AWS.S3({
        region: config.aws.s3.region,
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      });
      this.bucket = config.aws.s3.bucket;
    }
    
    logger.info(`File storage initialized: ${this.storageType}`);
  }

  /**
   * Generate secure filename
   * @param {string} originalFilename - Original filename from upload
   * @param {string} organizationId - Organization ID for namespacing
   * @returns {object} - Secure filename and metadata
   */
  generateSecureFilename(originalFilename, organizationId) {
    const extension = path.extname(originalFilename).toLowerCase();
    const safeExtension = extension.replace(/[^a-z0-9.]/gi, '');
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    
    // Secure filename: orgId/year/month/uuid.ext
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const secureName = `${uniqueId}${safeExtension}`;
    const securePath = `${organizationId}/${year}/${month}/${secureName}`;
    
    return {
      securePath,
      secureName,
      originalName: originalFilename,
      extension: safeExtension,
      timestamp,
      uniqueId,
    };
  }

  /**
   * Calculate file hash for integrity verification
   * @param {Buffer} buffer - File buffer
   * @returns {string} - SHA256 hash
   */
  calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Store file locally
   * @param {Buffer} buffer - File buffer
   * @param {string} securePath - Secure path for storage
   * @returns {Promise<string>} - Full file path
   */
  async storeLocal(buffer, securePath) {
    const fullPath = path.join(this.localStoragePath, securePath);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, buffer);
    
    logger.info(`File stored locally: ${securePath}`);
    return fullPath;
  }

  /**
   * Store file in S3
   * @param {Buffer} buffer - File buffer
   * @param {string} securePath - Secure path for storage
   * @param {string} contentType - MIME type
   * @returns {Promise<object>} - S3 upload result
   */
  async storeS3(buffer, securePath, contentType) {
    const params = {
      Bucket: this.bucket,
      Key: securePath,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256', // Encrypt at rest
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    };
    
    const result = await this.s3.upload(params).promise();
    
    logger.info(`File stored in S3: ${securePath}`);
    return result;
  }

  /**
   * Upload file with security checks
   * @param {object} options - Upload options
   * @returns {Promise<object>} - Upload result with metadata
   */
  async upload({ buffer, originalFilename, contentType, organizationId, userId }) {
    try {
      // Generate secure filename
      const fileInfo = this.generateSecureFilename(originalFilename, organizationId);
      
      // Calculate file hash for integrity
      const fileHash = this.calculateFileHash(buffer);
      
      // Store file based on storage type
      let storageLocation;
      if (this.storageType === 's3') {
        const s3Result = await this.storeS3(buffer, fileInfo.securePath, contentType);
        storageLocation = s3Result.Location;
      } else {
        storageLocation = await this.storeLocal(buffer, fileInfo.securePath);
      }
      
      // Return metadata
      return {
        success: true,
        securePath: fileInfo.securePath,
        secureName: fileInfo.secureName,
        originalName: fileInfo.originalName,
        extension: fileInfo.extension,
        storageType: this.storageType,
        storageLocation,
        fileHash,
        size: buffer.length,
        contentType,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('File upload error:', {
        error: error.message,
        originalFilename,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Retrieve file from storage
   * @param {string} securePath - Secure path of file
   * @returns {Promise<Buffer>} - File buffer
   */
  async retrieve(securePath) {
    try {
      if (this.storageType === 's3') {
        const params = {
          Bucket: this.bucket,
          Key: securePath,
        };
        
        const data = await this.s3.getObject(params).promise();
        return data.Body;
      } else {
        const fullPath = path.join(this.localStoragePath, securePath);
        return await fs.readFile(fullPath);
      }
    } catch (error) {
      logger.error('File retrieval error:', {
        error: error.message,
        securePath,
      });
      throw error;
    }
  }

  /**
   * Delete file from storage
   * @param {string} securePath - Secure path of file
   * @returns {Promise<boolean>} - Success status
   */
  async delete(securePath) {
    try {
      if (this.storageType === 's3') {
        const params = {
          Bucket: this.bucket,
          Key: securePath,
        };
        
        await this.s3.deleteObject(params).promise();
      } else {
        const fullPath = path.join(this.localStoragePath, securePath);
        await fs.unlink(fullPath);
      }
      
      logger.info(`File deleted: ${securePath}`);
      return true;
    } catch (error) {
      logger.error('File deletion error:', {
        error: error.message,
        securePath,
      });
      return false;
    }
  }

  /**
   * Generate signed URL for temporary file access (S3 only)
   * @param {string} securePath - Secure path of file
   * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
   * @returns {Promise<string>} - Signed URL
   */
  async getSignedUrl(securePath, expiresIn = 3600) {
    if (this.storageType !== 's3') {
      throw new Error('Signed URLs are only available for S3 storage');
    }
    
    const params = {
      Bucket: this.bucket,
      Key: securePath,
      Expires: expiresIn,
    };
    
    return this.s3.getSignedUrlPromise('getObject', params);
  }

  /**
   * Check if file exists
   * @param {string} securePath - Secure path of file
   * @returns {Promise<boolean>} - Exists status
   */
  async exists(securePath) {
    try {
      if (this.storageType === 's3') {
        const params = {
          Bucket: this.bucket,
          Key: securePath,
        };
        
        await this.s3.headObject(params).promise();
        return true;
      } else {
        const fullPath = path.join(this.localStoragePath, securePath);
        await fs.access(fullPath);
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   * @param {string} securePath - Secure path of file
   * @returns {Promise<object>} - File metadata
   */
  async getMetadata(securePath) {
    try {
      if (this.storageType === 's3') {
        const params = {
          Bucket: this.bucket,
          Key: securePath,
        };
        
        const data = await this.s3.headObject(params).promise();
        return {
          size: data.ContentLength,
          contentType: data.ContentType,
          lastModified: data.LastModified,
          metadata: data.Metadata,
        };
      } else {
        const fullPath = path.join(this.localStoragePath, securePath);
        const stats = await fs.stat(fullPath);
        return {
          size: stats.size,
          lastModified: stats.mtime,
        };
      }
    } catch (error) {
      logger.error('Get metadata error:', {
        error: error.message,
        securePath,
      });
      throw error;
    }
  }
}

// Export singleton instance
export default new FileStorage();
