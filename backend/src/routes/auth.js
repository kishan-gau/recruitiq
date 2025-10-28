import express from 'express';
import { register, login, logout, refresh, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { authSchemas } from '../utils/validationSchemas.js';

const router = express.Router();

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

export default router;

