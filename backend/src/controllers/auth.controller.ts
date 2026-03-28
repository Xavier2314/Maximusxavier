import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { createVirtualAccount } from '../services/paystack';
import { sendWelcomeEmail } from '../services/email';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, sponsorId, uplineId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || 'DOWNLINE',
      sponsorId: sponsorId || null,
      uplineId: uplineId || null,
    },
  });

  // Create wallet
  const wallet = await prisma.wallet.create({ data: { userId: user.id } });

  // Create virtual account via Paystack (non-blocking)
  createVirtualAccount(email, name).then(async (dva) => {
    if (dva.success) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          paystackAccountNumber: dva.accountNumber,
          paystackBankName: dva.bankName,
          paystackAccountName: dva.accountName,
          paystackBankCode: dva.bankCode,
          paystackReference: dva.reference,
        },
      });
    }
  }).catch(console.error);

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, name).catch(console.error);

  // Log audit
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_REGISTERED', entity: 'User', entityId: user.id },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, role: true, isActive: true, subscriptionEnd: true },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'USER_LOGIN', entity: 'User', entityId: user.id },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionEnd: user.subscriptionEnd,
      },
    },
  });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, name: true, email: true, role: true, subscriptionEnd: true, createdAt: true,
      sponsor: { select: { id: true, name: true, email: true } },
      upline: { select: { id: true, name: true, email: true } },
      wallet: {
        select: {
          id: true, totalEarned: true, totalWithdrawn: true, savingsBalance: true,
          savingsLockedUntil: true, paystackAccountNumber: true, paystackBankName: true,
          paystackAccountName: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(400).json({ success: false, message: 'Current password is incorrect' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  res.json({ success: true, message: 'Password changed successfully' });
};
