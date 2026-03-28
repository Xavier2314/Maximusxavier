import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const txIcon: Record<string, string> = {
  CREDIT: '⬆️', DEBIT: '⬇️', SAVINGS_LOCK: '🔒', SAVINGS_UNLOCK: '🔓',
};
const txColor: Record<string, string> = {
  CREDIT: 'text-green-600', DEBIT: 'text-red-600',
  SAVINGS_LOCK: 'text-purple-600', SAVINGS_UNLOCK: 'text-blue-600',
};

export default function Wallet() {
  const queryClient = useQueryClient();
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockForm, setLockForm] = useState({ amount: '', lockDays: '30' });
  const [page, setPage] = useState(1);

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => walletAPI.getMyWallet(),
  });

  const { data: txData } = useQuery({
    queryKey: ['my-transactions', page],
    queryFn: () => walletAPI.getMyTransactions(page),
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      walletAPI.lockSavings({ amount: parseFloat(lockForm.amount), lockDays: parseInt(lockForm.lockDays) }),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      setShowLockForm(false);
      setLockForm({ amount: '', lockDays: '30' });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to lock savings');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: () => walletAPI.unlockSavings(),
    onSuccess: (res) => {
      toast.success(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to unlock savings');
    },
  });

  const wallet = walletData?.data?.data;
  const transactions = txData?.data?.data?.transactions || [];
  const pagination = txData?.data?.data?.pagination;
  const availableBalance = wallet
    ? wallet.totalEarned - wallet.totalWithdrawn - wallet.savingsBalance
    : 0;
  const canUnlock =
    wallet?.savingsBalance > 0 &&
    wallet?.savingsLockedUntil &&
    new Date(wallet.savingsLockedUntil) <= new Date();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>

      {/* Account details */}
      {wallet?.paystackAccountNumber && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wide mb-2">Virtual Account</p>
          <p className="text-2xl font-bold tracking-widest mb-1">{wallet.paystackAccountNumber}</p>
          <p className="text-blue-200">{wallet.paystackBankName}</p>
          <p className="text-white font-medium">{wallet.paystackAccountName}</p>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: wallet?.totalEarned || 0, color: 'text-green-600', icon: '📈' },
          { label: 'Available', value: availableBalance, color: 'text-blue-600', icon: '💰' },
          { label: 'Withdrawn', value: wallet?.totalWithdrawn || 0, color: 'text-gray-700', icon: '💸' },
          { label: 'Savings', value: wallet?.savingsBalance || 0, color: 'text-purple-600', icon: '🔒' },
        ].map((item) => (
          <div key={item.label} className="card text-center">
            <span className="text-2xl">{item.icon}</span>
            <p className={`text-xl font-bold mt-2 ${item.color}`}>{formatCurrency(item.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Savings management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Savings Management</h3>
            {wallet?.savingsLockedUntil && (
              <p className="text-sm text-gray-500">
                Locked until: {format(new Date(wallet.savingsLockedUntil), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canUnlock && (
              <button
                onClick={() => unlockMutation.mutate()}
                disabled={unlockMutation.isPending}
                className="btn-secondary text-sm"
              >
                🔓 Unlock Savings
              </button>
            )}
            <button onClick={() => setShowLockForm(true)} className="btn-primary text-sm">
              🔒 Lock Savings
            </button>
          </div>
        </div>

        {showLockForm && (
          <form
            onSubmit={(e) => { e.preventDefault(); lockMutation.mutate(); }}
            className="border border-gray-100 rounded-lg p-4 space-y-3 mt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  required type="number" min="1" className="input"
                  placeholder="Amount to lock"
                  value={lockForm.amount}
                  onChange={(e) => setLockForm({ ...lockForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lock Duration</label>
                <select
                  className="input" value={lockForm.lockDays}
                  onChange={(e) => setLockForm({ ...lockForm, lockDays: e.target.value })}
                >
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">6 months</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={lockMutation.isPending} className="btn-primary text-sm">
                {lockMutation.isPending ? 'Locking...' : 'Confirm Lock'}
              </button>
              <button type="button" onClick={() => setShowLockForm(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction history */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: {
              id: string; type: string; amount: number;
              description: string; status: string; createdAt: string;
            }) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{txIcon[tx.type] || '💱'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')} · {tx.status}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${txColor[tx.type] || 'text-gray-700'}`}>
                  {['DEBIT', 'SAVINGS_LOCK'].includes(tx.type) ? '-' : '+'}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
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
    </div>
  );
}
