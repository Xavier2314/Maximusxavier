import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getWallet,
  getTransactions,
  creditWallet,
  lockSavings,
  unlockSavings,
} from '../controllers/wallet.controller';
import { authenticate, requireSubscription } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticate, requireSubscription);

router.get('/my', getWallet);
router.get('/user/:userId', [param('userId').notEmpty()], validateRequest, getWallet);
router.get('/transactions/my', getTransactions);
router.get('/transactions/:userId', [param('userId').notEmpty()], validateRequest, getTransactions);

router.post(
  '/credit',
  [
    body('userId').notEmpty(),
    body('amount').isFloat({ min: 1 }),
    body('description').optional().trim(),
  ],
  validateRequest,
  creditWallet
);

router.post(
  '/savings/lock',
  [
    body('amount').isFloat({ min: 1 }),
    body('lockDays').isInt({ min: 1, max: 365 }),
  ],
  validateRequest,
  lockSavings
);

router.post('/savings/unlock', unlockSavings);

export default router;
