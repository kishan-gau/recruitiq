import db from '../config/database.js'

/**
 * Log admin actions to audit log
 */
export const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send

    // Override send function to log after successful response
    res.send = function (data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Parse response to get entity ID if available
        let entityId = null
        try {
          const responseData = JSON.parse(data)
          entityId = responseData.id || responseData.data?.id || req.params.id || null
        } catch (e) {
          entityId = req.params.id || null
        }

        // Log to audit_log table (fire and forget, don't await)
        db.query(
          `INSERT INTO audit_log (
            admin_user_id, action, entity_type, entity_id, 
            details, ip_address, user_agent, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            req.user.id,
            action,
            entityType,
            entityId,
            JSON.stringify({
              method: req.method,
              path: req.path,
              body: req.body,
              query: req.query
            }),
            req.ip,
            req.get('user-agent')
          ]
        ).catch(err => {
          console.error('Audit log error:', err)
        })
      }

      // Call original send
      originalSend.call(this, data)
    }

    next()
  }
}
