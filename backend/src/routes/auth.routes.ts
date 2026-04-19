import { Router } from 'express';
import { registerParent, login, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register/parent
router.post('/register/parent', registerParent);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', authenticate, me);

export default router;
