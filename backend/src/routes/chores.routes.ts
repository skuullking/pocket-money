import { Router } from 'express';
import {
  getChores,
  createChore,
  submitChore,
  approveChore,
  rejectChore,
} from '../controllers/chores.controller';
import { requireRole } from '../middleware/roles';

const router = Router();

// All routes require authentication (applied in server.ts)

// GET /api/chores
router.get('/', getChores);

// POST /api/chores — parent creates a chore
router.post('/', requireRole('PARENT'), createChore);

// PATCH /api/chores/:id/submit — child submits completed chore
router.patch('/:id/submit', requireRole('CHILD'), submitChore);

// PATCH /api/chores/:id/approve — parent approves submitted chore
router.patch('/:id/approve', requireRole('PARENT'), approveChore);

// PATCH /api/chores/:id/reject — parent rejects submitted chore
router.patch('/:id/reject', requireRole('PARENT'), rejectChore);

export default router;
