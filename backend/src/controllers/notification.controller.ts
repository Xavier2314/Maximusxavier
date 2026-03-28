import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user!.userId } }),
    prisma.notification.count({ where: { userId: req.user!.userId, read: false } }),
  ]);

  res.json({
    success: true,
    data: { notifications, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { read: true },
  });

  res.json({ success: true, message: 'Notification marked as read' });
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });

  res.json({ success: true, message: 'All notifications marked as read' });
};
