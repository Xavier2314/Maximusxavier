import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  createUser,
  renewSubscription,
  getAuditLogs,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { listBanks } from '../services/paystack';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.post(
  '/users',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['DOWNLINE', 'SPONSOR', 'UPLINE', 'ADMIN']),
  ],
  validateRequest,
  createUser
);
router.post(
  '/subscriptions/renew',
  [body('userId').notEmpty(), body('months').optional().isInt({ min: 1 })],
  validateRequest,
  renewSubscription
);
router.get('/audit-logs', getAuditLogs);
router.get('/banks', async (_req, res) => {
  const result = await listBanks();
  res.json(result);
});

export default router;
