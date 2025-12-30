import {
  validateFileUploadSecurity,
  detectFileType,
  isDangerousExtension,
  sanitizeFilename,
  getAllowedFileTypes,
} from '../fileValidator.ts';

describe('File Validator', () => {
  describe('detectFileType', () => {
    it('should detect PDF files', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
      const type = detectFileType(pdfBuffer);
      expect(type).toBe('pdf');
    });

    it('should detect JPEG files', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const type = detectFileType(jpegBuffer);
      expect(type).toBe('jpeg');
    });

    it('should detect PNG files', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const type = detectFileType(pngBuffer);
      expect(type).toBe('png');
    });

    it('should detect DOCX files (ZIP signature)', () => {
      const docxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
      const type = detectFileType(docxBuffer);
      expect(type).toBe('docx');
    });

    it('should return null for unknown file types', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const type = detectFileType(unknownBuffer);
      expect(type).toBeNull();
    });
  });

  describe('isDangerousExtension', () => {
    it('should detect dangerous executable extensions', () => {
      expect(isDangerousExtension('malware.exe')).toBe(true);
      expect(isDangerousExtension('script.bat')).toBe(true);
      expect(isDangerousExtension('payload.ps1')).toBe(true);
      expect(isDangerousExtension('virus.com')).toBe(true);
    });

    it('should allow safe extensions', () => {
      expect(isDangerousExtension('document.pdf')).toBe(false);
      expect(isDangerousExtension('resume.docx')).toBe(false);
      expect(isDangerousExtension('notes.txt')).toBe(false);
      expect(isDangerousExtension('photo.jpg')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isDangerousExtension('MALWARE.EXE')).toBe(true);
      expect(isDangerousExtension('Script.BAT')).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
      expect(sanitizeFilename('../../../../malicious')).not.toContain('/');
    });

    it('should replace unsafe characters with underscores', () => {
      const result = sanitizeFilename('file<>:"|?*.txt');
      // Multiple consecutive underscores are collapsed into one
      expect(result).toBe('file_.txt');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFilename('my-resume_v2.pdf')).toBe('my-resume_v2.pdf');
      expect(sanitizeFilename('document.2023.docx')).toBe('document.2023.docx');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(250) + '.pdf';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(205); // 200 + '.pdf'
    });
  });

  describe('validateFileUploadSecurity', () => {
    const validPdfBuffer = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, // %PDF-
      ...Array(100).fill(0x00), // Padding
    ]);

    it('should validate a legitimate PDF file', () => {
      const result = validateFileUploadSecurity({
        buffer: validPdfBuffer,
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: validPdfBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.detectedType).toBe('pdf');
    });

    it('should reject files with path traversal in filename', () => {
      const result = validateFileUploadSecurity({
        buffer: validPdfBuffer,
        filename: '../../../malicious.pdf',
        mimeType: 'application/pdf',
        size: validPdfBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('path traversal');
    });

    it('should reject dangerous file extensions', () => {
      const exeBuffer = Buffer.from([0x4D, 0x5A, ...Array(100).fill(0x00)]);
      const result = validateFileUploadSecurity({
        buffer: exeBuffer,
        filename: 'malware.exe',
        mimeType: 'application/octet-stream',
        size: exeBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('dangerous extension');
    });

    it('should reject files exceeding size limit', () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const result = validateFileUploadSecurity({
        buffer: largeBuffer,
        filename: 'large.pdf',
        mimeType: 'application/pdf',
        size: largeBuffer.length,
        maxSize: 10 * 1024 * 1024, // 10MB limit
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should reject empty files', () => {
      const emptyBuffer = Buffer.alloc(5);
      const result = validateFileUploadSecurity({
        buffer: emptyBuffer,
        filename: 'empty.pdf',
        mimeType: 'application/pdf',
        size: emptyBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('too small');
    });

    it('should reject files with mismatched signatures (spoofing)', () => {
      const exeBuffer = Buffer.from([0x4D, 0x5A, ...Array(100).fill(0x00)]); // EXE signature
      const result = validateFileUploadSecurity({
        buffer: exeBuffer,
        filename: 'fake.pdf',
        mimeType: 'application/pdf',
        size: exeBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unable to detect') || e.includes('not allowed'))).toBe(true);
    });

    it('should warn about MIME type mismatches', () => {
      const result = validateFileUploadSecurity({
        buffer: validPdfBuffer,
        filename: 'document.pdf',
        mimeType: 'text/plain', // Wrong MIME type
        size: validPdfBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(true); // Still valid
      expect(result.warnings.some(w => w.includes('MIME type'))).toBe(true);
    });

    it('should warn about file extension mismatches', () => {
      const result = validateFileUploadSecurity({
        buffer: validPdfBuffer,
        filename: 'document.txt', // Wrong extension
        mimeType: 'application/pdf',
        size: validPdfBuffer.length,
        allowedTypes: ['pdf'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(true); // Still valid (magic number is correct)
      expect(result.warnings.some(w => w.includes('extension'))).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0x00)]);
      const result = validateFileUploadSecurity({
        buffer: jpegBuffer,
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: jpegBuffer.length,
        allowedTypes: ['pdf', 'docx'], // JPEG not allowed
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('not allowed');
    });

    it('should warn about Office documents with potential macros', () => {
      const docxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, ...Array(100).fill(0x00)]);
      const result = validateFileUploadSecurity({
        buffer: docxBuffer,
        filename: 'document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: docxBuffer.length,
        allowedTypes: ['docx'],
        organizationId: 'org-123',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('macros'))).toBe(true);
    });
  });

  describe('getAllowedFileTypes', () => {
    it('should return configuration for resume context', () => {
      const config = getAllowedFileTypes('resume');
      expect(config.types).toContain('pdf');
      expect(config.types).toContain('docx');
      expect(config.maxSize).toBe(10 * 1024 * 1024);
    });

    it('should return configuration for avatar context', () => {
      const config = getAllowedFileTypes('avatar');
      expect(config.types).toContain('jpeg');
      expect(config.types).toContain('png');
      expect(config.maxSize).toBe(5 * 1024 * 1024);
    });

    it('should return document config for unknown contexts', () => {
      const config = getAllowedFileTypes('unknown');
      expect(config.types).toContain('pdf');
      expect(config.maxSize).toBe(10 * 1024 * 1024);
    });
  });
});
