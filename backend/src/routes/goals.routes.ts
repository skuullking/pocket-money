import { Router } from 'express';
import {
  getGoals,
  createGoal,
  fundGoal,
  withdrawGoal,
} from '../controllers/goals.controller';
import { requireRole } from '../middleware/roles';

const router = Router();

// All routes require authentication (applied in server.ts)

// GET /api/goals
router.get('/', getGoals);

// POST /api/goals — parent or child can create goals
router.post('/', createGoal);

// POST /api/goals/:id/fund — child funds a goal
router.post('/:id/fund', requireRole('CHILD'), fundGoal);

// POST /api/goals/:id/withdraw — child withdraws from a goal
router.post('/:id/withdraw', requireRole('CHILD'), withdrawGoal);

export default router;
