import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getStats(),
  });

  const stats = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide overview and controls</p>
      </div>

      {/* User stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Users</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: stats?.users?.total || 0, icon: '👥', color: 'text-blue-600' },
            { label: 'Downlines', value: stats?.users?.downlines || 0, icon: '👤', color: 'text-green-600' },
            { label: 'Sponsors', value: stats?.users?.sponsors || 0, icon: '🏢', color: 'text-purple-600' },
          ].map((item) => (
            <div key={item.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                </div>
                <span className="text-3xl">{item.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Platform Funds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Earnings (All Wallets)', value: stats?.wallets?.totalEarned || 0, icon: '📈', color: 'text-green-600' },
            { label: 'Total Withdrawn', value: stats?.wallets?.totalWithdrawn || 0, icon: '💸', color: 'text-red-600' },
            { label: 'Total in Savings', value: stats?.wallets?.totalSavings || 0, icon: '🔒', color: 'text-purple-600' },
          ].map((item) => (
            <div key={item.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
                <span className="text-3xl">{item.icon}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Withdrawals by Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['pending', 'approved', 'completed', 'rejected'].map((status) => {
            const s = stats?.withdrawals?.[status] || { count: 0, amount: 0 };
            const colors: Record<string, string> = {
              pending: 'border-yellow-200 bg-yellow-50',
              approved: 'border-blue-200 bg-blue-50',
              completed: 'border-green-200 bg-green-50',
              rejected: 'border-red-200 bg-red-50',
            };
            const textColors: Record<string, string> = {
              pending: 'text-yellow-700',
              approved: 'text-blue-700',
              completed: 'text-green-700',
              rejected: 'text-red-700',
            };
            return (
              <div key={status} className={`rounded-xl border p-4 ${colors[status]}`}>
                <p className={`text-sm font-medium uppercase tracking-wide ${textColors[status]}`}>
                  {status}
                </p>
                <p className={`text-2xl font-bold mt-1 ${textColors[status]}`}>{s.count}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(s.amount)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/admin/users" className="card hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
          <span className="text-3xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900">Manage Users</p>
            <p className="text-sm text-gray-500">Create, update, view all users</p>
          </div>
        </a>
        <a href="/withdrawals" className="card hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
          <span className="text-3xl">💸</span>
          <div>
            <p className="font-semibold text-gray-900">Withdrawals</p>
            <p className="text-sm text-gray-500">Process approved withdrawals</p>
          </div>
        </a>
        <a href="/admin/audit" className="card hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
          <span className="text-3xl">📋</span>
          <div>
            <p className="font-semibold text-gray-900">Audit Logs</p>
            <p className="text-sm text-gray-500">Full activity trail</p>
          </div>
        </a>
      </div>
    </div>
  );
}
