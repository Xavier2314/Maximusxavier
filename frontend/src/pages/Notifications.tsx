import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const typeIcon: Record<string, string> = {
  success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️',
};
const typeBg: Record<string, string> = {
  success: 'border-l-green-500', warning: 'border-l-yellow-500',
  error: 'border-l-red-500', info: 'border-l-blue-500',
};

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const notifications = data?.data?.data?.notifications || [];
  const unreadCount = data?.data?.data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="btn-secondary text-sm"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: {
            id: string; title: string; message: string;
            type: string; read: boolean; createdAt: string;
          }) => (
            <div
              key={n.id}
              className={`card border-l-4 ${typeBg[n.type] || 'border-l-gray-300'} ${!n.read ? 'bg-blue-50/40' : ''} cursor-pointer`}
              onClick={() => !n.read && markOneMutation.mutate(n.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-gray-900 ${!n.read ? 'font-semibold' : ''}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
