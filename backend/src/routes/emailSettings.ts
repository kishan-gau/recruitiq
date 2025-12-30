/**
 * Email Settings Routes
 * 
 * API endpoints for managing email configuration
 */

import express from 'express';
import { body } from 'express-validator';
import {
  getEmailSettings,
  saveEmailSettings,
  testEmailConfiguration,
  deleteEmailSettings,
} from '../controllers/emailSettingsController.ts';
import { authenticateTenant } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = express.Router();

// All email settings routes require tenant authentication
router.use(authenticateTenant);

// Validation schemas
const saveEmailSettingsSchema = [
  body('provider').isIn(['smtp', 'sendgrid', 'ses']).withMessage('Invalid email provider'),
  body('fromEmail').isEmail().withMessage('Invalid from email address'),
  body('fromName').trim().notEmpty().withMessage('From name is required'),
  body('replyToEmail').optional().isEmail().withMessage('Invalid reply-to email address'),
  
  // SMTP validation (required if provider is smtp)
  body('smtp').optional().isObject(),
  body('smtp.host').if(body('provider').equals('smtp')).notEmpty().withMessage('SMTP host is required'),
  body('smtp.port').if(body('provider').equals('smtp')).isInt({ min: 1, max: 65535 }).withMessage('Invalid SMTP port'),
  body('smtp.username').if(body('provider').equals('smtp')).notEmpty().withMessage('SMTP username is required'),
  body('smtp.password').if(body('provider').equals('smtp')).notEmpty().withMessage('SMTP password is required'),
  body('smtp.secure').if(body('provider').equals('smtp')).isIn(['tls', 'ssl', 'none']).withMessage('Invalid SMTP security option'),
  
  // SendGrid validation (required if provider is sendgrid)
  body('sendgrid').optional().isObject(),
  body('sendgrid.apiKey').if(body('provider').equals('sendgrid')).notEmpty().withMessage('SendGrid API key is required'),
  
  // AWS SES validation (required if provider is ses)
  body('aws').optional().isObject(),
  body('aws.region').if(body('provider').equals('ses')).notEmpty().withMessage('AWS region is required'),
  body('aws.accessKeyId').if(body('provider').equals('ses')).notEmpty().withMessage('AWS access key ID is required'),
  body('aws.secretAccessKey').if(body('provider').equals('ses')).notEmpty().withMessage('AWS secret access key is required'),
];

const testEmailSchema = [
  body('testEmail').isEmail().withMessage('Invalid test email address'),
];

/**
 * GET /api/settings/email
 * Get current email settings
 */
router.get('/', getEmailSettings);

/**
 * POST /api/settings/email
 * Save email settings
 */
router.post('/', validate(saveEmailSettingsSchema), saveEmailSettings);

/**
 * POST /api/settings/email/test
 * Test email configuration
 */
router.post('/test', validate(testEmailSchema), testEmailConfiguration);

/**
 * DELETE /api/settings/email
 * Delete email settings
 */
router.delete('/', deleteEmailSettings);

export default router;
