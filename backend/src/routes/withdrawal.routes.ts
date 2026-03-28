import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  processWithdrawal,
  getWithdrawals,
  getWithdrawalById,
} from '../controllers/withdrawal.controller';
import { authenticate, requireSubscription } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticate, requireSubscription);

router.get('/', getWithdrawals);
router.get('/:id', [param('id').notEmpty()], validateRequest, getWithdrawalById);

router.post(
  '/',
  [
    body('downlineId').notEmpty(),
    body('amount').isFloat({ min: 1 }),
    body('bankName').optional().trim(),
    body('accountNumber').optional().trim(),
    body('accountName').optional().trim(),
    body('reason').optional().trim(),
  ],
  validateRequest,
  createWithdrawal
);

router.put('/:id/approve', [param('id').notEmpty()], validateRequest, approveWithdrawal);

router.put(
  '/:id/reject',
  [param('id').notEmpty(), body('reason').optional().trim()],
  validateRequest,
  rejectWithdrawal
);

router.put('/:id/process', [param('id').notEmpty()], validateRequest, processWithdrawal);

export default router;
