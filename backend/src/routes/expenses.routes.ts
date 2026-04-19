import { Router } from 'express';
import {
  requestExpense,
  approveExpense,
  rejectExpense,
  deductExpense,
  refundExpense,
  getExpenseHistory,
} from '../controllers/expenses.controller';
import { requireRole } from '../middleware/roles';

const router = Router();

// All routes require authentication (applied in server.ts)

// GET /api/expenses — get expense history
router.get('/', getExpenseHistory);

// POST /api/expenses/request — child requests an expense
router.post('/request', requireRole('CHILD'), requestExpense);

// POST /api/expenses/deduct — parent directly deducts (imposed expense)
router.post('/deduct', requireRole('PARENT'), deductExpense);

// POST /api/expenses/refund — parent refunds an expense
router.post('/refund', requireRole('PARENT'), refundExpense);

// PATCH /api/expenses/:id/approve — parent approves
router.patch('/:id/approve', requireRole('PARENT'), approveExpense);

// PATCH /api/expenses/:id/reject — parent rejects
router.patch('/:id/reject', requireRole('PARENT'), rejectExpense);

export default router;
