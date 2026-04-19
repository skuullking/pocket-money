import { Router } from 'express';
import { getTransactions } from '../controllers/transactions.controller';

const router = Router();

// All routes require authentication (applied in server.ts)

// GET /api/transactions
router.get('/', getTransactions);

export default router;
