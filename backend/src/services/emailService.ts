/**
 * Email Service
 * 
 * Centralized email service for sending emails across all applications
 * Supports SMTP, SendGrid, and AWS SES
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.ts';

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
  }

  /**
   * Initialize email service with configuration
   * @param {Object} config - Email configuration
   * @param {string} config.provider - 'smtp' | 'sendgrid' | 'ses'
   * @param {Object} config.smtp - SMTP configuration (if provider is smtp)
   * @param {Object} config.sendgrid - SendGrid configuration (if provider is sendgrid)
   * @param {Object} config.aws - AWS SES configuration (if provider is ses)
   * @param {string} config.fromEmail - From email address
   * @param {string} config.fromName - From name
   * @param {string} config.replyToEmail - Reply-to email address (optional)
   */
  async initialize(config) {
    try {
      this.config = config;

      switch (config.provider) {
        case 'smtp':
          await this.initializeSMTP(config.smtp);
          break;
        case 'sendgrid':
          await this.initializeSendGrid(config.sendgrid);
          break;
        case 'ses':
          await this.initializeAWSSES(config.aws);
          break;
        default:
          throw new Error(`Unsupported email provider: ${config.provider}`);
      }

      logger.info(`Email service initialized with provider: ${config.provider}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Initialize SMTP transporter
   */
  async initializeSMTP(smtpConfig) {
    const { host, port, username, password, secure } = smtpConfig;

    const transportConfig = {
      host,
      port: parseInt(port),
      secure: secure === 'ssl', // true for SSL (port 465), false for other ports
      auth: {
        user: username,
        pass: password,
      },
    };

    // Add TLS options for TLS connections
    if (secure === 'tls') {
      transportConfig.secure = false;
      transportConfig.requireTLS = true;
      transportConfig.tls = {
        ciphers: 'SSLv3',
        rejectUnauthorized: false, // Allow self-signed certificates in development
      };
    }

    this.transporter = nodemailer.createTransporter(transportConfig);

    // Verify connection
    await this.transporter.verify();
    logger.info('SMTP transporter verified successfully');
  }

  /**
   * Initialize SendGrid transporter
   */
  async initializeSendGrid(sendgridConfig) {
    const { apiKey } = sendgridConfig;

    this.transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });

    // Verify connection
    await this.transporter.verify();
    logger.info('SendGrid transporter verified successfully');
  }

  /**
   * Initialize AWS SES transporter
   */
  async initializeAWSSES(awsConfig) {
    const AWS = (await import('aws-sdk')).default;
    const { region, accessKeyId, secretAccessKey } = awsConfig;

    // Configure AWS
    AWS.config.update({
      region,
      accessKeyId,
      secretAccessKey,
    });

    this.transporter = nodemailer.createTransporter({
      SES: new AWS.SES({ apiVersion: '2010-12-01' }),
    });

    logger.info('AWS SES transporter initialized successfully');
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email address(es)
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text body (optional)
   * @param {string} options.html - HTML body (required if text is not provided)
   * @param {Object[]} options.attachments - Email attachments (optional)
   * @param {string} options.fromEmail - Override from email (optional)
   * @param {string} options.fromName - Override from name (optional)
   * @param {string} options.replyTo - Override reply-to (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Please configure email settings first.');
    }

    const { to, subject, text, html, attachments, fromEmail, fromName, replyTo } = options;

    // Validate required fields
    if (!to) {
      throw new Error('Recipient email address is required');
    }
    if (!subject) {
      throw new Error('Email subject is required');
    }
    if (!text && !html) {
      throw new Error('Email body (text or html) is required');
    }

    // Prepare mail options
    const from = fromEmail || this.config.fromEmail;
    const name = fromName || this.config.fromName;
    const fromAddress = name ? `${name} <${from}>` : from;
    
    const mailOptions = {
      from: fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html,
      attachments,
    };

    // Add reply-to if provided
    if (replyTo || this.config.replyToEmail) {
      mailOptions.replyTo = replyTo || this.config.replyToEmail;
    }

    try {
      logger.info('Sending email', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        provider: this.config?.provider,
      });

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      throw error;
    }
  }

  /**
   * Send bulk emails (with delay to avoid rate limits)
   * @param {Array<Object>} emails - Array of email options
   * @param {number} delayMs - Delay between emails in milliseconds (default: 100ms)
   * @returns {Promise<Array>} Array of send results
   */
  async sendBulkEmails(emails, delayMs = 100) {
    const results = [];

    for (const emailOptions of emails) {
      try {
        const result = await this.sendEmail(emailOptions);
        results.push({ ...result, email: emailOptions.to });
        
        // Add delay to avoid rate limits
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          success: false,
          email: emailOptions.to,
          error: error.message,
        });
      }
    }

    logger.info('Bulk email send completed', {
      total: emails.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Test email configuration
   * @param {string} testEmail - Email address to send test email to
   * @returns {Promise<Object>} Test result
   */
  async testConfiguration(testEmail) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      await this.sendEmail({
        to: testEmail,
        subject: 'Test Email - Configuration Successful',
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p><strong>Provider:</strong> ${this.config.provider}</p>
          <p><strong>From:</strong> ${this.config.fromName} &lt;${this.config.fromEmail}&gt;</p>
          <p>If you received this email, your email configuration is working properly!</p>
        `,
      });

      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test email: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Check if email service is initialized
   */
  isInitialized() {
    return this.transporter !== null;
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfiguration() {
    if (!this.config) {
      return null;
    }

    return {
      provider: this.config.provider,
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      replyToEmail: this.config.replyToEmail,
      initialized: this.isInitialized(),
    };
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
