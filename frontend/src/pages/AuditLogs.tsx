import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  USER_REGISTERED: 'bg-green-100 text-green-700',
  USER_LOGIN: 'bg-blue-100 text-blue-700',
  USER_UPDATED: 'bg-yellow-100 text-yellow-700',
  WALLET_CREDITED: 'bg-emerald-100 text-emerald-700',
  WITHDRAWAL_INITIATED: 'bg-orange-100 text-orange-700',
  WITHDRAWAL_APPROVED: 'bg-blue-100 text-blue-700',
  WITHDRAWAL_REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWAL_PROCESSED: 'bg-green-100 text-green-700',
  SUBSCRIPTION_RENEWED: 'bg-purple-100 text-purple-700',
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => adminAPI.getAuditLogs(page),
  });

  const logs = data?.data?.data?.logs || [];
  const pagination = data?.data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">Immutable record of all platform activity</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map((log: {
              id: string; action: string; entity: string; entityId?: string;
              details?: Record<string, unknown>; createdAt: string;
              user?: { name: string; email: string };
            }) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">{log.entity}</span>
                    {log.entityId && (
                      <span className="text-xs text-gray-300 font-mono">#{log.entityId.slice(-8)}</span>
                    )}
                  </div>
                  {log.user && (
                    <p className="text-sm text-gray-700 mt-1">
                      By: <span className="font-medium">{log.user.name}</span>{' '}
                      <span className="text-gray-400">({log.user.email})</span>
                    </p>
                  )}
                  {log.details && (
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate max-w-sm">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a')}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-gray-400">No audit logs found</div>
            )}
          </div>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page === pagination.pages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
