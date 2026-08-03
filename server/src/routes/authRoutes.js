import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

// Public routes (rate-limited)
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Protected route
router.get('/me', protect, getMe);

export default router;
