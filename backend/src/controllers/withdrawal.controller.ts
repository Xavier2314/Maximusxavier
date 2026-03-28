import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import {
  sendWithdrawalRequestEmail,
  sendWithdrawalApprovedEmail,
  sendWithdrawalRejectedEmail,
  sendWithdrawalCompletedEmail,
} from '../services/email';
import { createTransferRecipient, initiateTransfer } from '../services/paystack';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const createWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!['SPONSOR', 'ADMIN'].includes(req.user!.role)) {
    res.status(403).json({ success: false, message: 'Only sponsors can initiate withdrawals' });
    return;
  }

  const { downlineId, amount, reason, bankName, accountNumber, accountName } = req.body;

  // Verify the sponsor manages this downline
  if (req.user!.role === 'SPONSOR') {
    const downline = await prisma.user.findFirst({
      where: { id: downlineId, sponsorId: req.user!.userId },
    });
    if (!downline) {
      res.status(403).json({ success: false, message: 'You do not manage this downline' });
      return;
    }
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: downlineId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const availableBalance = wallet.totalEarned - wallet.totalWithdrawn - wallet.savingsBalance;
  if (amount > availableBalance) {
    res.status(400).json({ success: false, message: 'Insufficient available balance' });
    return;
  }

  const withdrawal = await prisma.withdrawal.create({
    data: {
      initiatorId: req.user!.userId,
      downlineId,
      amount,
      reason,
      bankName,
      accountNumber,
      accountName,
      status: 'PENDING',
    },
    include: {
      initiator: { select: { name: true } },
      downline: { select: { name: true, email: true } },
    },
  });

  // Notify downline
  await prisma.notification.create({
    data: {
      userId: downlineId,
      title: 'Withdrawal Request Pending',
      message: `${withdrawal.initiator.name} has requested a withdrawal of ₦${amount.toLocaleString()} from your wallet. Your approval is required.`,
      type: 'warning',
    },
  });

  sendWithdrawalRequestEmail(
    withdrawal.downline.email,
    withdrawal.downline.name,
    amount,
    withdrawal.initiator.name,
    withdrawal.id,
    FRONTEND_URL
  ).catch(console.error);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'WITHDRAWAL_INITIATED',
      entity: 'Withdrawal',
      entityId: withdrawal.id,
      details: { amount, downlineId },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Withdrawal request created. Awaiting downline approval.',
    data: withdrawal,
  });
};

export const approveWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: {
      downline: { select: { id: true, name: true, email: true } },
      initiator: { select: { name: true, email: true } },
    },
  });

  if (!withdrawal) {
    res.status(404).json({ success: false, message: 'Withdrawal not found' });
    return;
  }

  // Only the downline whose wallet it is can approve
  if (withdrawal.downlineId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Only the wallet owner can approve withdrawals' });
    return;
  }

  if (withdrawal.status !== 'PENDING') {
    res.status(400).json({ success: false, message: `Withdrawal is already ${withdrawal.status}` });
    return;
  }

  await prisma.withdrawal.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approverId: req.user!.userId,
      approvedAt: new Date(),
    },
  });

  // Notify initiator
  await prisma.notification.create({
    data: {
      userId: withdrawal.initiatorId,
      title: 'Withdrawal Approved',
      message: `${withdrawal.downline.name} has approved the withdrawal of ₦${withdrawal.amount.toLocaleString()}.`,
      type: 'success',
    },
  });

  sendWithdrawalApprovedEmail(
    withdrawal.initiator.email,
    withdrawal.initiator.name,
    withdrawal.amount
  ).catch(console.error);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'WITHDRAWAL_APPROVED',
      entity: 'Withdrawal',
      entityId: id,
    },
  });

  res.json({ success: true, message: 'Withdrawal approved. Admin will process the transfer.' });
};

export const rejectWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: {
      downline: { select: { name: true, email: true } },
      initiator: { select: { name: true, email: true } },
    },
  });

  if (!withdrawal) {
    res.status(404).json({ success: false, message: 'Withdrawal not found' });
    return;
  }

  if (withdrawal.downlineId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (withdrawal.status !== 'PENDING') {
    res.status(400).json({ success: false, message: `Withdrawal is already ${withdrawal.status}` });
    return;
  }

  await prisma.withdrawal.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason },
  });

  // Notify initiator
  await prisma.notification.create({
    data: {
      userId: withdrawal.initiatorId,
      title: 'Withdrawal Rejected',
      message: `${withdrawal.downline.name} has rejected the withdrawal of ₦${withdrawal.amount.toLocaleString()}.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'error',
    },
  });

  sendWithdrawalRejectedEmail(
    withdrawal.initiator.email,
    withdrawal.initiator.name,
    withdrawal.amount,
    reason
  ).catch(console.error);

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'WITHDRAWAL_REJECTED',
      entity: 'Withdrawal',
      entityId: id,
      details: { reason },
    },
  });

  res.json({ success: true, message: 'Withdrawal rejected' });
};

export const processWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin only' });
    return;
  }

  const { id } = req.params;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: {
      downline: { select: { name: true, email: true } },
      initiator: { select: { name: true, email: true } },
    },
  });

  if (!withdrawal) {
    res.status(404).json({ success: false, message: 'Withdrawal not found' });
    return;
  }

  if (withdrawal.status !== 'APPROVED') {
    res.status(400).json({ success: false, message: 'Withdrawal must be approved first' });
    return;
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: withdrawal.downlineId } });
  if (!wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  // Create transfer recipient and initiate transfer via Paystack
  let transferSuccess = false;
  let transferReference: string | undefined;

  if (withdrawal.accountNumber && withdrawal.bankName) {
    const recipientResult = await createTransferRecipient(
      withdrawal.accountName || withdrawal.downline.name,
      withdrawal.accountNumber,
      withdrawal.bankName
    );

    if (recipientResult.success && recipientResult.recipientCode) {
      const transferResult = await initiateTransfer(
        withdrawal.amount,
        recipientResult.recipientCode,
        withdrawal.reason || 'Freelance earnings withdrawal'
      );

      if (transferResult.success) {
        transferSuccess = true;
        transferReference = transferResult.reference;
      }
    }
  }

  const status = transferSuccess ? 'COMPLETED' : 'FAILED';

  await prisma.$transaction([
    prisma.withdrawal.update({
      where: { id },
      data: { status, completedAt: new Date() },
    }),
    ...(transferSuccess
      ? [
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { totalWithdrawn: { increment: withdrawal.amount } },
          }),
          prisma.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEBIT',
              amount: withdrawal.amount,
              description: `Withdrawal processed - ${withdrawal.reason || 'Freelance earnings'}`,
              reference: transferReference,
              status: 'COMPLETED',
            },
          }),
        ]
      : []),
  ]);

  if (transferSuccess) {
    await prisma.notification.create({
      data: {
        userId: withdrawal.downlineId,
        title: 'Withdrawal Completed',
        message: `₦${withdrawal.amount.toLocaleString()} has been transferred successfully.`,
        type: 'success',
      },
    });
    sendWithdrawalCompletedEmail(
      withdrawal.downline.email,
      withdrawal.downline.name,
      withdrawal.amount
    ).catch(console.error);
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'WITHDRAWAL_PROCESSED',
      entity: 'Withdrawal',
      entityId: id,
      details: { status, transferReference },
    },
  });

  res.json({
    success: transferSuccess,
    message: transferSuccess ? 'Withdrawal processed successfully' : 'Transfer failed - check bank details',
    data: { status, transferReference },
  });
};

export const getWithdrawals = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;

  let where: Record<string, unknown> = {};

  if (req.user!.role === 'DOWNLINE') {
    where.downlineId = req.user!.userId;
  } else if (req.user!.role === 'SPONSOR') {
    where.initiatorId = req.user!.userId;
  }

  if (status) where.status = status;

  const [withdrawals, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      include: {
        initiator: { select: { id: true, name: true, email: true } },
        downline: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.withdrawal.count({ where }),
  ]);

  res.json({
    success: true,
    data: { withdrawals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};

export const getWithdrawalById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, name: true, email: true } },
      downline: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  if (!withdrawal) {
    res.status(404).json({ success: false, message: 'Withdrawal not found' });
    return;
  }

  // Access control
  if (
    req.user!.role !== 'ADMIN' &&
    withdrawal.downlineId !== req.user!.userId &&
    withdrawal.initiatorId !== req.user!.userId
  ) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: withdrawal });
};
