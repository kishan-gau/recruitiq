import express from 'express';
import { 
  register, 
  login, 
  logout, 
  refresh, 
  me,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { authSchemas } from '../utils/validationSchemas.js';
import { createEndpointLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Rate limiter for password reset endpoints (3 requests per hour per IP)
const passwordResetLimiter = createEndpointLimiter({
  endpoint: 'password-reset',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
});

// POST /api/auth/register
router.post('/register', validate(authSchemas.register, 'body'), register);

// POST /api/auth/login
router.post('/login', validate(authSchemas.login, 'body'), login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// GET /api/auth/me
router.get('/me', authenticate, me);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);

// GET /api/auth/reset-password/:token - Verify reset token
router.get('/reset-password/:token', verifyPasswordResetToken);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', passwordResetLimiter, resetPassword);

export default router;

