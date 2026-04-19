import { Router } from 'express';
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  applyPenalty,
} from '../controllers/rules.controller';
import { requireRole } from '../middleware/roles';

const router = Router();

// All routes require authentication (applied in server.ts)

// GET /api/rules — all family members can see rules
router.get('/', getRules);

// POST /api/rules — parent creates a rule
router.post('/', requireRole('PARENT'), createRule);

// PUT /api/rules/:id — parent updates a rule
router.put('/:id', requireRole('PARENT'), updateRule);

// DELETE /api/rules/:id — parent deletes a rule
router.delete('/:id', requireRole('PARENT'), deleteRule);

// POST /api/rules/:id/apply — parent applies penalty to a child
router.post('/:id/apply', requireRole('PARENT'), applyPenalty);

export default router;
