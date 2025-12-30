import Joi from 'joi';
import db from '../config/database.ts';
import logger from '../utils/logger.ts';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.ts';

// Validation schemas
const sendMessageSchema = Joi.object({
  applicationId: Joi.string().uuid().required(),
  messageType: Joi.string().valid('status-update', 'interview-invite', 'document-request', 'general', 'rejection', 'offer').required(),
  subject: Joi.string().max(255).required(),
  message: Joi.string().required(),
  isPublic: Joi.boolean().default(true),
  attachments: Joi.array().items(Joi.object({
    filename: Joi.string().required(),
    contentType: Joi.string().required(),
    data: Joi.string().required()
  })).default([])
});

/**
 * Send a message to candidate
 * POST /api/communications
 */
export async function sendMessage(req, res, next) {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    const userId = req.user.id;
    const organizationId = req.user.organization_id;
    
    // Verify application belongs to user's organization
    const appResult = await db.query(
      'SELECT id FROM applications WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [value.applicationId, organizationId]
    );
    
    if (appResult.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }
    
    // Process attachments (store as JSONB metadata, actual files in application_data)
    const attachmentMetadata = value.attachments.map(att => ({
      filename: att.filename,
      contentType: att.contentType,
      size: Buffer.from(att.data, 'base64').length,
      uploadedAt: new Date().toISOString()
    }));
    
    // Create communication
    const result = await db.query(`
      INSERT INTO communications (
        application_id, from_type, from_user_id,
        message_type, subject, message, is_public, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      value.applicationId,
      'recruiter',
      userId,
      value.messageType,
      value.subject,
      value.message,
      value.isPublic,
      JSON.stringify(attachmentMetadata)
    ]);
    
    const communication = result.rows[0];
    
    logger.info(`Communication sent: ${communication.id} for application ${value.applicationId}`);
    
    // TODO: Send email notification to candidate
    
    res.status(201).json({
      success: true,
      communicationId: communication.id,
      createdAt: communication.created_at,
      message: 'Message sent successfully'
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Get all communications for an application
 * GET /api/communications/:applicationId
 */
export async function getApplicationCommunications(req, res, next) {
  try {
    const { applicationId } = req.params;
    const organizationId = req.user.organization_id;
    const { includePrivate = true } = req.query;
    
    // Verify application belongs to user's organization
    const appResult = await db.query(
      'SELECT id FROM applications WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [applicationId, organizationId]
    );
    
    if (appResult.rows.length === 0) {
      throw new NotFoundError('Application not found');
    }
    
    let query = `
      SELECT 
        c.id, c.from_type, c.from_user_id, c.from_candidate_id,
        c.message_type, c.subject, c.message,
        c.is_public, c.attachments, c.read_at, c.created_at,
        u.name as from_user_name,
        cand.first_name as from_candidate_first_name,
        cand.last_name as from_candidate_last_name
      FROM communications c
      LEFT JOIN users u ON c.from_user_id = u.id
      LEFT JOIN candidates cand ON c.from_candidate_id = cand.id
      WHERE c.application_id = $1
    `;
    
    if (includePrivate === 'false' || includePrivate === false) {
      query += ' AND c.is_public = true';
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const result = await db.query(query, [applicationId]);
    
    res.json({
      communications: result.rows.map(comm => ({
        id: comm.id,
        fromType: comm.from_type,
        fromUser: comm.from_user_id ? {
          id: comm.from_user_id,
          name: comm.from_user_name
        } : null,
        fromCandidate: comm.from_candidate_id ? {
          id: comm.from_candidate_id,
          name: `${comm.from_candidate_first_name} ${comm.from_candidate_last_name}`
        } : null,
        messageType: comm.message_type,
        subject: comm.subject,
        message: comm.message,
        isPublic: comm.is_public,
        attachments: comm.attachments || [],
        readAt: comm.read_at,
        createdAt: comm.created_at
      }))
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Mark communication as read
 * PUT /api/communications/:id/read
 */
export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify communication belongs to user's organization
    const result = await db.query(`
      UPDATE communications c
      SET read_at = NOW()
      FROM applications a
      WHERE c.id = $1
        AND c.application_id = a.id
        AND a.organization_id = $2
        AND c.read_at IS NULL
      RETURNING c.id
    `, [id, organizationId]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Communication not found or already read');
    }
    
    res.json({
      success: true,
      message: 'Communication marked as read'
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Delete communication
 * DELETE /api/communications/:id
 */
export async function deleteCommunication(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify communication belongs to user's organization and is from recruiter
    const result = await db.query(`
      DELETE FROM communications c
      USING applications a
      WHERE c.id = $1
        AND c.application_id = a.id
        AND a.organization_id = $2
        AND c.from_type = 'recruiter'
      RETURNING c.id
    `, [id, organizationId]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Communication not found or cannot be deleted');
    }
    
    logger.info(`Communication deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Communication deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
}
