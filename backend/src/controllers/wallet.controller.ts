import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendSavingsLockedEmail } from '../services/email';

export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params.userId || req.user!.userId;

  // Sponsors and admins can view any wallet; downlines only their own
  if (req.user!.role === 'DOWNLINE' && userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const availableBalance = wallet.totalEarned - wallet.totalWithdrawn - wallet.savingsBalance;

  res.json({
    success: true,
    data: { ...wallet, availableBalance },
  });
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params.userId || req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  if (req.user!.role === 'DOWNLINE' && userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { walletId: wallet.id } }),
  ]);

  res.json({
    success: true,
    data: { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};

export const creditWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!['ADMIN', 'SPONSOR'].includes(req.user!.role)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { userId, amount, description, reference } = req.body;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const [updatedWallet, transaction] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { totalEarned: { increment: amount } },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount,
        description: description || 'Earnings credit',
        reference,
        status: 'COMPLETED',
      },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'WALLET_CREDITED',
      entity: 'Wallet',
      entityId: wallet.id,
      details: { amount, targetUserId: userId },
    },
  });

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId,
      title: 'Earnings Credited',
      message: `₦${amount.toLocaleString()} has been credited to your wallet.`,
      type: 'success',
    },
  });

  res.json({
    success: true,
    message: 'Wallet credited successfully',
    data: { wallet: updatedWallet, transaction },
  });
};

export const lockSavings = async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, lockDays } = req.body;
  const userId = req.user!.userId;

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const availableBalance = wallet.totalEarned - wallet.totalWithdrawn - wallet.savingsBalance;
  if (amount > availableBalance) {
    res.status(400).json({ success: false, message: 'Insufficient available balance' });
    return;
  }

  const lockUntil = new Date();
  lockUntil.setDate(lockUntil.getDate() + lockDays);

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        savingsBalance: { increment: amount },
        savingsLockedUntil: lockUntil,
      },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'SAVINGS_LOCK',
        amount,
        description: `Savings locked for ${lockDays} days`,
        status: 'COMPLETED',
      },
    }),
  ]);

  sendSavingsLockedEmail(wallet.user.email, wallet.user.name, amount, lockUntil).catch(console.error);

  res.json({
    success: true,
    message: `₦${amount.toLocaleString()} locked in savings until ${lockUntil.toLocaleDateString()}`,
  });
};

export const unlockSavings = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const isAdmin = req.user!.role === 'ADMIN';
  const lockExpired = wallet.savingsLockedUntil && new Date(wallet.savingsLockedUntil) <= new Date();

  if (!isAdmin && !lockExpired) {
    res.status(400).json({
      success: false,
      message: `Savings are locked until ${wallet.savingsLockedUntil?.toLocaleDateString()}`,
    });
    return;
  }

  const unlockedAmount = wallet.savingsBalance;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { savingsBalance: 0, savingsLockedUntil: null },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'SAVINGS_UNLOCK',
        amount: unlockedAmount,
        description: 'Savings unlocked',
        status: 'COMPLETED',
      },
    }),
  ]);

  res.json({
    success: true,
    message: `₦${unlockedAmount.toLocaleString()} unlocked from savings`,
  });
};
