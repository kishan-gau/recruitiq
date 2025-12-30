/**
 * Database Query Logging Middleware
 * Logs all SQL queries for security monitoring and audit trails
 * Detects suspicious query patterns
 */

import logger from '../utils/logger.ts';

// Suspicious patterns to detect
const SUSPICIOUS_PATTERNS = [
  {
    pattern: /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b.*\bWHERE\b.*\bOR\b.*['"]?\s*=\s*['"]?)/i,
    description: 'Potential SQL injection attempt (UNION or OR-based)',
    severity: 'CRITICAL'
  },
  {
    pattern: /(\bDROP\b|\bTRUNCATE\b|\bDELETE\b.*\bFROM\b.*\bWHERE\b.*['"]?\s*=\s*['"]?)/i,
    description: 'Potential destructive SQL injection',
    severity: 'CRITICAL'
  },
  {
    pattern: /(\bEXEC\b|\bEXECUTE\b|\bxp_cmdshell\b)/i,
    description: 'Potential command injection attempt',
    severity: 'CRITICAL'
  },
  {
    pattern: /(--|\/\*|\*\/|;)/,
    description: 'SQL comment or statement terminator in query',
    severity: 'HIGH'
  },
  {
    pattern: /(\bINFORMATION_SCHEMA\b|\bpg_catalog\b|\bpg_tables\b)/i,
    description: 'Query accessing database metadata',
    severity: 'MEDIUM'
  }
];

// Track query statistics
const queryStats = {
  total: 0,
  byType: {
    SELECT: 0,
    INSERT: 0,
    UPDATE: 0,
    DELETE: 0,
    OTHER: 0
  },
  suspicious: 0,
  slowQueries: 0,
  errors: 0
};

/**
 * Analyze query for suspicious patterns
 */
export function analyzeQuery(query, params = []) {
  const analysis = {
    isSuspicious: false,
    alerts: [],
    queryType: 'OTHER',
    parameterCount: params.length
  };

  // Determine query type
  const queryUpper = query.trim().toUpperCase();
  if (queryUpper.startsWith('SELECT')) {
    analysis.queryType = 'SELECT';
  } else if (queryUpper.startsWith('INSERT')) {
    analysis.queryType = 'INSERT';
  } else if (queryUpper.startsWith('UPDATE')) {
    analysis.queryType = 'UPDATE';
  } else if (queryUpper.startsWith('DELETE')) {
    analysis.queryType = 'DELETE';
  }

  // Check for suspicious patterns
  for (const { pattern, description, severity } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(query)) {
      analysis.isSuspicious = true;
      analysis.alerts.push({ severity, description });
    }
  }

  // Check if parameters are used (if query has placeholders)
  const placeholderCount = (query.match(/\$\d+/g) || []).length;
  if (placeholderCount > 0 && params.length === 0) {
    analysis.alerts.push({
      severity: 'HIGH',
      description: 'Query has placeholders but no parameters provided'
    });
  }

  // Check if query is parameterized (has $1, $2, etc.)
  analysis.isParameterized = placeholderCount > 0;

  return analysis;
}

/**
 * Log query execution
 */
export function logQuery(query, params = [], metadata = {}) {
  queryStats.total++;

  const analysis = analyzeQuery(query, params);
  queryStats.byType[analysis.queryType]++;

  // Log suspicious queries immediately
  if (analysis.isSuspicious || analysis.alerts.length > 0) {
    queryStats.suspicious++;

    logger.warn('Suspicious database query detected', {
      query: query.substring(0, 200), // Truncate for logging
      params: params.length > 0 ? `[${params.length} parameters]` : 'none',
      parameterized: analysis.isParameterized,
      alerts: analysis.alerts,
      metadata: {
        userId: metadata.userId,
        ip: metadata.ip,
        endpoint: metadata.endpoint
      }
    });
  }

  // Log query details (debug level for normal queries)
  logger.debug('Database query executed', {
    type: analysis.queryType,
    parameterized: analysis.isParameterized,
    paramCount: params.length,
    queryLength: query.length,
    endpoint: metadata.endpoint
  });

  return analysis;
}

/**
 * Log slow query
 */
export function logSlowQuery(query, params, executionTime, threshold = 1000) {
  if (executionTime > threshold) {
    queryStats.slowQueries++;

    logger.warn('Slow database query detected', {
      query: query.substring(0, 200),
      executionTime: `${executionTime}ms`,
      threshold: `${threshold}ms`,
      params: params.length > 0 ? `[${params.length} parameters]` : 'none'
    });
  }
}

/**
 * Log query error
 */
export function logQueryError(query, params, error, metadata = {}) {
  queryStats.errors++;

  // Check if error might be from SQL injection attempt
  const isSQLError = error.message && (
    error.message.includes('syntax error') ||
    error.message.includes('invalid input') ||
    error.message.includes('permission denied')
  );

  logger.error('Database query error', {
    query: query.substring(0, 200),
    error: error.message,
    code: error.code,
    potentialInjection: isSQLError,
    params: params.length > 0 ? `[${params.length} parameters]` : 'none',
    metadata: {
      userId: metadata.userId,
      ip: metadata.ip,
      endpoint: metadata.endpoint
    }
  });
}

/**
 * Get query statistics
 */
export function getQueryStats() {
  return {
    ...queryStats,
    timestamp: new Date().toISOString()
  };
}

/**
 * Reset statistics (for testing)
 */
export function resetStats() {
  queryStats.total = 0;
  queryStats.byType = {
    SELECT: 0,
    INSERT: 0,
    UPDATE: 0,
    DELETE: 0,
    OTHER: 0
  };
  queryStats.suspicious = 0;
  queryStats.slowQueries = 0;
  queryStats.errors = 0;
}

/**
 * Wrapper for pool.query that adds logging
 */
export function createLoggedQuery(pool) {
  const originalQuery = pool.query.bind(pool);

  return async function loggedQuery(text, params, metadata = {}) {
    const startTime = Date.now();

    try {
      // Log query execution
      logQuery(text, params || [], metadata);

      // Execute query
      const result = await originalQuery(text, params);

      // Check execution time
      const executionTime = Date.now() - startTime;
      logSlowQuery(text, params || [], executionTime);

      return result;
    } catch (error) {
      // Log error
      logQueryError(text, params || [], error, metadata);
      throw error;
    }
  };
}

export default {
  logQuery,
  logSlowQuery,
  logQueryError,
  getQueryStats,
  resetStats,
  createLoggedQuery
};
