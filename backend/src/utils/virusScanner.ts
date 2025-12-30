import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from './logger.js';

const execPromise = promisify(exec);

/**
 * Virus scanner utility
 * Supports ClamAV integration for production environments
 */

class VirusScanner {
  enabled: boolean;
  scannerType: string;
  clamavPath: string;
  clamavSocket: string;
  tempDir: string;

  constructor() {
    this.enabled = process.env.VIRUS_SCANNING_ENABLED === 'true';
    this.scannerType = process.env.VIRUS_SCANNER_TYPE || 'clamav'; // clamav or mock
    this.clamavPath = process.env.CLAMAV_PATH || 'clamscan';
    this.clamavSocket = process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl';
    this.tempDir = process.env.TEMP_DIR || os.tmpdir();
    
    if (this.enabled) {
      this.checkAvailability();
    } else {
      logger.info('Virus scanning is disabled');
    }
  }

  /**
   * Check if virus scanner is available
   */
  async checkAvailability() {
    try {
      if (this.scannerType === 'clamav') {
        const { stdout } = await execPromise(`${this.clamavPath} --version`);
        logger.info(`ClamAV virus scanner available: ${stdout.trim()}`);
        return true;
      }
    } catch (error) {
      logger.warn('ClamAV not available, virus scanning will be skipped', {
        error: error.message,
      });
      this.enabled = false;
      return false;
    }
  }

  /**
   * Scan file buffer for viruses
   * @param {Buffer} buffer - File buffer to scan
   * @param {string} filename - Original filename
   * @returns {Promise<object>} - Scan result
   */
  async scanBuffer(buffer, filename) {
    if (!this.enabled) {
      return {
        clean: true,
        scanned: false,
        message: 'Virus scanning is disabled',
      };
    }

    try {
      // Write buffer to temporary file for scanning
      const tempFile = path.join(this.tempDir, `scan_${Date.now()}_${filename}`);
      await fs.writeFile(tempFile, buffer);

      // Scan the file
      const result = await this.scanFile(tempFile);

      // Clean up temp file
      await fs.unlink(tempFile).catch(err => 
        logger.error('Failed to delete temp scan file', { error: err.message })
      );

      return result;
    } catch (error) {
      logger.error('Buffer scan error:', {
        error: error.message,
        filename,
      });
      
      // On error, treat as potentially infected for safety
      return {
        clean: false,
        scanned: true,
        error: error.message,
        message: 'Scan failed, file rejected for safety',
      };
    }
  }

  /**
   * Scan file at path for viruses
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} - Scan result
   */
  async scanFile(filePath) {
    if (!this.enabled) {
      return {
        clean: true,
        scanned: false,
        message: 'Virus scanning is disabled',
      };
    }

    try {
      if (this.scannerType === 'clamav') {
        return await this.scanWithClamAV(filePath);
      } else {
        return await this.mockScan(filePath);
      }
    } catch (error) {
      logger.error('File scan error:', {
        error: error.message,
        filePath,
      });
      
      return {
        clean: false,
        scanned: true,
        error: error.message,
        message: 'Scan failed, file rejected for safety',
      };
    }
  }

  /**
   * Scan file with ClamAV
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} - Scan result
   */
  async scanWithClamAV(filePath) {
    try {
      const command = `${this.clamavPath} --no-summary "${filePath}"`;
      const { stdout, stderr } = await execPromise(command);

      // ClamAV exit codes:
      // 0 = no virus found
      // 1 = virus found
      // 2+ = error
      
      if (stdout.includes('OK')) {
        logger.info('ClamAV scan: file is clean', { filePath });
        return {
          clean: true,
          scanned: true,
          scanner: 'clamav',
          message: 'No threats detected',
        };
      } else if (stdout.includes('FOUND')) {
        const match = stdout.match(/(.+):\s(.+)\sFOUND/);
        const virusName = match ? match[2] : 'Unknown';
        
        logger.warn('ClamAV scan: virus detected', {
          filePath,
          virus: virusName,
        });
        
        return {
          clean: false,
          scanned: true,
          scanner: 'clamav',
          virus: virusName,
          message: `Virus detected: ${virusName}`,
        };
      }

      // Unexpected output
      logger.warn('ClamAV scan: unexpected output', {
        filePath,
        stdout,
        stderr,
      });
      
      return {
        clean: false,
        scanned: true,
        scanner: 'clamav',
        message: 'Unexpected scan result, file rejected for safety',
      };
    } catch (error) {
      // Exit code 1 means virus found
      if (error.code === 1 && error.stdout && error.stdout.includes('FOUND')) {
        const match = error.stdout.match(/(.+):\s(.+)\sFOUND/);
        const virusName = match ? match[2] : 'Unknown';
        
        logger.warn('ClamAV scan: virus detected', {
          filePath,
          virus: virusName,
        });
        
        return {
          clean: false,
          scanned: true,
          scanner: 'clamav',
          virus: virusName,
          message: `Virus detected: ${virusName}`,
        };
      }

      throw error;
    }
  }

  /**
   * Mock scan for testing (always returns clean)
   * @param {string} filePath - Path to file
   * @returns {Promise<object>} - Scan result
   */
  async mockScan(filePath) {
    logger.info('Mock virus scan (always clean)', { filePath });
    
    // Simulate scan delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      clean: true,
      scanned: true,
      scanner: 'mock',
      message: 'Mock scan: no threats detected',
    };
  }

  /**
   * Scan multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Array<object>>} - Array of scan results
   */
  async scanMultiple(filePaths) {
    const results = await Promise.all(
      filePaths.map(filePath => this.scanFile(filePath))
    );
    
    return results;
  }

  /**
   * Get scanner status
   * @returns {object} - Scanner status information
   */
  getStatus() {
    return {
      enabled: this.enabled,
      scanner: this.scannerType,
      available: this.enabled,
    };
  }
}

// Export singleton instance
const virusScanner = new VirusScanner();

export default virusScanner;

/**
 * Express middleware for virus scanning
 */
export function virusScanMiddleware(options: { required?: boolean } = {}) {
  const { required = true } = options;

  return async (req: any, res: any, next: any) => {
    try {
      // Check if file exists in request
      if (!req.file && !req.files) {
        if (required) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'No file uploaded',
          });
        }
        return next();
      }

      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        return next();
      }

      // Scan the file
      const scanResult = await virusScanner.scanBuffer(file.buffer, file.originalname);

      // Attach scan result to request
      req.virusScanResult = scanResult;

      // Reject if not clean
      if (!scanResult.clean) {
        logger.warn('File upload rejected: virus detected', {
          filename: file.originalname,
          scanResult,
          ip: req.ip,
          userId: req.user?.id,
        });

        return res.status(400).json({
          error: 'Malicious File Detected',
          message: scanResult.message || 'The uploaded file contains malicious content and has been rejected.',
        });
      }

      next();
    } catch (error) {
      logger.error('Virus scan middleware error:', {
        error: error.message,
        filename: req.file?.originalname,
      });

      // For safety, reject on error
      return res.status(500).json({
        error: 'Scan Error',
        message: 'Unable to verify file safety. Please try again.',
      });
    }
  };
}
