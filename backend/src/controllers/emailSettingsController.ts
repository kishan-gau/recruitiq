/**
 * Email Settings Controller
 * 
 * Handle email configuration management
 */

import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { query } from '../config/database.js';

/**
 * GET /api/settings/email
 * Get current email settings (without sensitive data)
 */
export async function getEmailSettings(req, res) {
  try {
    const { organization_id: organizationId } = req.user;

    logger.info('Fetching email settings', { organizationId });

    // Query email settings from database
    const result = await query(
      `SELECT 
        provider,
        from_email,
        from_name,
        reply_to_email,
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_secure,
        sendgrid_api_key,
        aws_region,
        aws_access_key_id,
        is_configured,
        last_tested_at,
        created_at,
        updated_at
      FROM email_settings
      WHERE organization_id = $1 AND deleted_at IS NULL`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          configured: false,
          settings: null,
        },
      });
    }

    const settings: any = result.rows[0];

    // Return settings without sensitive data (passwords/keys are not returned)
    res.status(200).json({
      success: true,
      data: {
        configured: settings.is_configured,
        provider: settings.provider,
        fromEmail: settings.from_email,
        fromName: settings.from_name,
        replyToEmail: settings.reply_to_email,
        smtp: settings.provider === 'smtp' ? {
          host: settings.smtp_host,
          port: settings.smtp_port,
          username: settings.smtp_username,
          secure: settings.smtp_secure,
          passwordConfigured: true, // Don't return actual password
        } : null,
        sendgrid: settings.provider === 'sendgrid' ? {
          apiKeyConfigured: !!settings.sendgrid_api_key,
        } : null,
        aws: settings.provider === 'ses' ? {
          region: settings.aws_region,
          accessKeyId: settings.aws_access_key_id,
          secretKeyConfigured: true, // Don't return actual secret
        } : null,
        lastTestedAt: settings.last_tested_at,
        updatedAt: settings.updated_at,
      },
    });
  } catch (_error) {
    logger.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch email settings',
    });
  }
}

/**
 * POST /api/settings/email
 * Save email settings
 */
export async function saveEmailSettings(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { provider, fromEmail, fromName, replyToEmail, smtp, sendgrid, aws } = req.body;

    logger.info('Saving email settings', { organizationId, provider });

    // Encrypt sensitive data
    const encryptedData: any = {};
    
    if (provider === 'smtp' && smtp) {
      encryptedData.smtpPassword = encrypt(smtp.password);
    } else if (provider === 'sendgrid' && sendgrid) {
      encryptedData.sendgridApiKey = encrypt(sendgrid.apiKey);
    } else if (provider === 'ses' && aws) {
      encryptedData.awsSecretAccessKey = encrypt(aws.secretAccessKey);
    }

    // Upsert email settings
    const sql = `
      INSERT INTO email_settings (
        organization_id,
        provider,
        from_email,
        from_name,
        reply_to_email,
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password,
        smtp_secure,
        sendgrid_api_key,
        aws_region,
        aws_access_key_id,
        aws_secret_access_key,
        is_configured,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      ON CONFLICT (organization_id)
      DO UPDATE SET
        provider = EXCLUDED.provider,
        from_email = EXCLUDED.from_email,
        from_name = EXCLUDED.from_name,
        reply_to_email = EXCLUDED.reply_to_email,
        smtp_host = EXCLUDED.smtp_host,
        smtp_port = EXCLUDED.smtp_port,
        smtp_username = EXCLUDED.smtp_username,
        smtp_password = EXCLUDED.smtp_password,
        smtp_secure = EXCLUDED.smtp_secure,
        sendgrid_api_key = EXCLUDED.sendgrid_api_key,
        aws_region = EXCLUDED.aws_region,
        aws_access_key_id = EXCLUDED.aws_access_key_id,
        aws_secret_access_key = EXCLUDED.aws_secret_access_key,
        is_configured = EXCLUDED.is_configured,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      organizationId,
      provider,
      fromEmail,
      fromName,
      replyToEmail || null,
      provider === 'smtp' ? smtp.host : null,
      provider === 'smtp' ? smtp.port : null,
      provider === 'smtp' ? smtp.username : null,
      provider === 'smtp' ? encryptedData.smtpPassword : null,
      provider === 'smtp' ? smtp.secure : null,
      provider === 'sendgrid' ? encryptedData.sendgridApiKey : null,
      provider === 'ses' ? aws.region : null,
      provider === 'ses' ? aws.accessKeyId : null,
      provider === 'ses' ? encryptedData.awsSecretAccessKey : null,
      true, // is_configured
      userId,
    ];

    await query(sql, values);

    // Initialize email service with new configuration
    await initializeEmailService(organizationId);

    logger.info('Email settings saved successfully', { organizationId, provider });

    res.status(200).json({
      success: true,
      message: 'Email settings saved successfully',
      data: {
        provider,
        fromEmail,
        fromName,
      },
    });
  } catch (_error) {
    logger.error('Error saving email settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to save email settings',
    });
  }
}

/**
 * POST /api/settings/email/test
 * Test email configuration
 */
export async function testEmailConfiguration(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { testEmail } = req.body;

    logger.info('Testing email configuration', { organizationId, testEmail });

    // Initialize email service if not already initialized
    await initializeEmailService(organizationId);

    // Send test email
    const result = await emailService.testConfiguration(testEmail);

    if (result.success) {
      // Update last_tested_at in database
      await query(
        `UPDATE email_settings 
         SET last_tested_at = CURRENT_TIMESTAMP 
         WHERE organization_id = $1`,
        [organizationId]
      );

      logger.info('Email test successful', { organizationId, testEmail });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      logger.warn('Email test failed', { organizationId, error: result.error });

      res.status(400).json({
        success: false,
        error: 'Configuration Test Failed',
        message: result.message,
      });
    }
  } catch (_error) {
    logger.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to test email configuration',
    });
  }
}

/**
 * DELETE /api/settings/email
 * Delete email settings
 */
export async function deleteEmailSettings(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    logger.info('Deleting email settings', { organizationId });

    await query(
      `UPDATE email_settings 
       SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2 
       WHERE organization_id = $1`,
      [organizationId, userId]
    );

    logger.info('Email settings deleted successfully', { organizationId });

    res.status(200).json({
      success: true,
      message: 'Email settings deleted successfully',
    });
  } catch (_error) {
    logger.error('Error deleting email settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete email settings',
    });
  }
}

/**
 * Helper function to initialize email service from database
 */
export async function initializeEmailService(organizationId) {
  try {
    const result = await query(
      `SELECT * FROM email_settings 
       WHERE organization_id = $1 AND deleted_at IS NULL AND is_configured = true`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Email settings not configured');
    }

    const settings: any = result.rows[0];

    // Decrypt sensitive data
    const config: any = {
      provider: settings.provider,
      fromEmail: settings.from_email,
      fromName: settings.from_name,
      replyToEmail: settings.reply_to_email,
    };

    if (settings.provider === 'smtp') {
      config.smtp = {
        host: settings.smtp_host,
        port: settings.smtp_port,
        username: settings.smtp_username,
        password: decrypt(settings.smtp_password),
        secure: settings.smtp_secure,
      };
    } else if (settings.provider === 'sendgrid') {
      config.sendgrid = {
        apiKey: decrypt(settings.sendgrid_api_key),
      };
    } else if (settings.provider === 'ses') {
      config.aws = {
        region: settings.aws_region,
        accessKeyId: settings.aws_access_key_id,
        secretAccessKey: decrypt(settings.aws_secret_access_key),
      };
    }

    await emailService.initialize(config);
    return true;
  } catch (_error) {
    logger.error('Failed to initialize email service:', error);
    throw error;
  }
}
