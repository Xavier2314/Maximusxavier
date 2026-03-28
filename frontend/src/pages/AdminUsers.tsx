import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `₦${(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const roleBadge: Record<string, string> = {
  ADMIN: 'badge bg-red-100 text-red-700',
  SPONSOR: 'badge bg-purple-100 text-purple-700',
  DOWNLINE: 'badge bg-blue-100 text-blue-700',
  UPLINE: 'badge bg-green-100 text-green-700',
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [renewUserId, setRenewUserId] = useState<string | null>(null);
  const [renewMonths, setRenewMonths] = useState(12);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => adminAPI.getUsers({ search: search || undefined, role: roleFilter || undefined }),
  });

  const renewMutation = useMutation({
    mutationFn: ({ userId, months }: { userId: string; months: number }) =>
      adminAPI.renewSubscription(userId, months),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setRenewUserId(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to renew');
    },
  });

  const users = data?.data?.data?.users || [];
  const total = data?.data?.data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text" placeholder="Search by name or email..." className="input max-w-sm"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-xs" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="DOWNLINE">Downline</option>
          <option value="SPONSOR">Sponsor</option>
          <option value="UPLINE">Upline</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Renew modal */}
      {renewUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Renew Subscription</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Months to add</label>
              <select
                className="input" value={renewMonths}
                onChange={(e) => setRenewMonths(parseInt(e.target.value))}
              >
                <option value={1}>1 month ($2)</option>
                <option value={3}>3 months ($6)</option>
                <option value={6}>6 months ($12)</option>
                <option value={12}>12 months ($24)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => renewMutation.mutate({ userId: renewUserId, months: renewMonths })}
                disabled={renewMutation.isPending}
                className="btn-primary flex-1"
              >
                {renewMutation.isPending ? 'Renewing...' : 'Renew'}
              </button>
              <button onClick={() => setRenewUserId(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Earnings</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Withdrawn</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Subscription</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: {
                id: string; name: string; email: string; role: string;
                isActive: boolean; subscriptionEnd?: string; createdAt: string;
                sponsor?: { name: string };
                wallet?: { totalEarned: number; totalWithdrawn: number; paystackAccountNumber?: string };
              }) => {
                const subActive = u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date();
                return (
                  <tr key={u.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.sponsor && <p className="text-xs text-gray-400">Sponsor: {u.sponsor.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={roleBadge[u.role] || 'badge bg-gray-100'}>{u.role}</span>
                      {!u.isActive && <span className="badge bg-red-100 text-red-700 ml-1">Inactive</span>}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-green-600">
                      {formatCurrency(u.wallet?.totalEarned || 0)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {formatCurrency(u.wallet?.totalWithdrawn || 0)}
                    </td>
                    <td className="py-4 px-4">
                      {subActive ? (
                        <div>
                          <span className="badge bg-green-100 text-green-700">Active</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Expires {format(new Date(u.subscriptionEnd!), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ) : (
                        <span className="badge bg-red-100 text-red-700">Expired</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setRenewUserId(u.id)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Renew Sub
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
