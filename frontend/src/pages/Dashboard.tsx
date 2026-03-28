import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletAPI, withdrawalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const StatCard = ({
  label, value, icon, color, subtext,
}: {
  label: string; value: string; icon: string; color: string; subtext?: string;
}) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

const statusBadge: Record<string, string> = {
  PENDING: 'badge bg-yellow-100 text-yellow-700',
  APPROVED: 'badge bg-blue-100 text-blue-700',
  COMPLETED: 'badge bg-green-100 text-green-700',
  REJECTED: 'badge bg-red-100 text-red-700',
  FAILED: 'badge bg-gray-100 text-gray-700',
};

export default function Dashboard() {
  const { user } = useAuth();

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => walletAPI.getMyWallet(),
  });

  const { data: withdrawalData } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => withdrawalAPI.getWithdrawals({ page: 1 }),
  });

  const wallet = walletData?.data?.data;
  const withdrawals = withdrawalData?.data?.data?.withdrawals || [];
  const availableBalance = wallet
    ? wallet.totalEarned - wallet.totalWithdrawn - wallet.savingsBalance
    : 0;

  // Build chart data from transactions
  const transactions = wallet?.transactions || [];
  const chartData = transactions
    .slice(0, 7)
    .reverse()
    .map((t: { createdAt: string; type: string; amount: number }) => ({
      date: format(new Date(t.createdAt), 'MMM dd'),
      amount: t.type === 'CREDIT' ? t.amount : 0,
      withdrawn: t.type === 'DEBIT' ? t.amount : 0,
    }));

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · Role: {user?.role}
        </p>
      </div>

      {/* Virtual Account Info */}
      {wallet?.paystackAccountNumber && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-blue-200 text-sm mb-1">Your Virtual Account</p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold tracking-wider">{wallet.paystackAccountNumber}</p>
              <p className="text-blue-200 text-sm">{wallet.paystackBankName} · {wallet.paystackAccountName}</p>
            </div>
          </div>
          <p className="text-blue-200 text-xs mt-3">Send earnings directly to this account</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Earnings" value={formatCurrency(wallet?.totalEarned || 0)}
          icon="📈" color="text-green-600"
        />
        <StatCard
          label="Available Balance" value={formatCurrency(availableBalance)}
          icon="💰" color="text-blue-600"
        />
        <StatCard
          label="Total Withdrawn" value={formatCurrency(wallet?.totalWithdrawn || 0)}
          icon="💸" color="text-gray-700"
        />
        <StatCard
          label="Savings (Locked)" value={formatCurrency(wallet?.savingsBalance || 0)}
          icon="🔒" color="text-purple-600"
          subtext={
            wallet?.savingsLockedUntil
              ? `Until ${format(new Date(wallet.savingsLockedUntil), 'MMM d, yyyy')}`
              : undefined
          }
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Earnings Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="url(#colorEarnings)" strokeWidth={2} name="Earnings" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Withdrawals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Withdrawals</h3>
          <a href="/withdrawals" className="text-sm text-blue-600 hover:underline">View all</a>
        </div>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">💸</p>
            <p className="text-sm">No withdrawals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.slice(0, 5).map((w: {
              id: string; amount: number; status: string; createdAt: string;
              initiator?: { name: string }; downline?: { name: string };
            }) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(w.amount)}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(w.createdAt), 'MMM d, yyyy')} ·{' '}
                    {user?.role === 'DOWNLINE' ? `By ${w.initiator?.name}` : `To ${w.downline?.name}`}
                  </p>
                </div>
                <span className={statusBadge[w.status] || 'badge bg-gray-100 text-gray-700'}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
