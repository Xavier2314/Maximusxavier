import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const [totalUsers, totalDownlines, totalSponsors, withdrawalStats, walletAgg] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'DOWNLINE', isActive: true } }),
    prisma.user.count({ where: { role: 'SPONSOR', isActive: true } }),
    prisma.withdrawal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.wallet.aggregate({
      _sum: { totalEarned: true, totalWithdrawn: true, savingsBalance: true },
    }),
  ]);

  const withdrawalSummary = withdrawalStats.reduce(
    (acc, item) => {
      acc[item.status.toLowerCase()] = { count: item._count.id, amount: item._sum.amount || 0 };
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, downlines: totalDownlines, sponsors: totalSponsors },
      wallets: {
        totalEarned: walletAgg._sum.totalEarned || 0,
        totalWithdrawn: walletAgg._sum.totalWithdrawn || 0,
        totalSavings: walletAgg._sum.savingsBalance || 0,
      },
      withdrawals: withdrawalSummary,
    },
  });
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const role = req.query.role as string;
  const search = req.query.search as string;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        subscriptionEnd: true, createdAt: true,
        sponsor: { select: { id: true, name: true } },
        wallet: {
          select: { totalEarned: true, totalWithdrawn: true, savingsBalance: true,
            paystackAccountNumber: true, paystackBankName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, isActive: true,
      subscriptionEnd: true, createdAt: true,
      sponsor: { select: { id: true, name: true, email: true } },
      upline: { select: { id: true, name: true, email: true } },
      downlines: { select: { id: true, name: true, email: true, role: true } },
      wallet: {
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, role, isActive, sponsorId, uplineId } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { name, role, isActive, sponsorId, uplineId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      details: { changes: { name, role, isActive } },
    },
  });

  res.json({ success: true, data: user });
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role, sponsorId, uplineId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already exists' });
    return;
  }

  const hashed = await bcrypt.hash(password || 'Welcome@123', 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'DOWNLINE', sponsorId, uplineId },
  });

  await prisma.wallet.create({ data: { userId: user.id } });

  res.status(201).json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
};

export const renewSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, months } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const currentEnd = user.subscriptionEnd && user.subscriptionEnd > new Date()
    ? user.subscriptionEnd
    : new Date();

  const newEnd = new Date(currentEnd);
  newEnd.setMonth(newEnd.getMonth() + (months || 12));

  const amount = (months || 12) * 2; // $2 per month

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { subscriptionEnd: newEnd } }),
    prisma.subscription.upsert({
      where: { userId },
      create: { userId, amount, startDate: new Date(), endDate: newEnd },
      update: { endDate: newEnd, amount: { increment: amount }, isActive: true },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'SUBSCRIPTION_RENEWED',
      entity: 'User',
      entityId: userId,
      details: { months, newEnd },
    },
  });

  res.json({
    success: true,
    message: `Subscription renewed until ${newEnd.toLocaleDateString()}`,
    data: { subscriptionEnd: newEnd },
  });
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};
