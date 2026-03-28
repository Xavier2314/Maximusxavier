import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withdrawalAPI, adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const statusBadge: Record<string, string> = {
  PENDING: 'badge bg-yellow-100 text-yellow-700',
  APPROVED: 'badge bg-blue-100 text-blue-700',
  COMPLETED: 'badge bg-green-100 text-green-700',
  REJECTED: 'badge bg-red-100 text-red-700',
  FAILED: 'badge bg-gray-100 text-gray-700',
};

interface WithdrawalForm {
  downlineId: string;
  amount: string;
  reason: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function Withdrawals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState<WithdrawalForm>({
    downlineId: '', amount: '', reason: '', bankName: '', accountNumber: '', accountName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals', filterStatus],
    queryFn: () => withdrawalAPI.getWithdrawals({ status: filterStatus || undefined }),
  });

  const { data: banksData } = useQuery({
    queryKey: ['banks'],
    queryFn: () => adminAPI.getBanks(),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      withdrawalAPI.createWithdrawal({
        downlineId: form.downlineId,
        amount: parseFloat(form.amount),
        reason: form.reason,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
      }),
    onSuccess: () => {
      toast.success('Withdrawal request created');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      setShowForm(false);
      setForm({ downlineId: '', amount: '', reason: '', bankName: '', accountNumber: '', accountName: '' });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create withdrawal');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => withdrawalAPI.approveWithdrawal(id),
    onSuccess: () => {
      toast.success('Withdrawal approved');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to approve');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      withdrawalAPI.rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast.success('Withdrawal rejected');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      setRejectId(null);
      setRejectReason('');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to reject');
    },
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => withdrawalAPI.processWithdrawal(id),
    onSuccess: () => {
      toast.success('Withdrawal processed');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to process');
    },
  });

  const withdrawals = data?.data?.data?.withdrawals || [];
  const banks = banksData?.data?.banks || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage withdrawal requests with dual approval</p>
        </div>
        {['SPONSOR', 'ADMIN'].includes(user?.role || '') && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New Request
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Create withdrawal modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Withdrawal Request</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Downline User ID</label>
                <input
                  required className="input" placeholder="Downline's user ID"
                  value={form.downlineId}
                  onChange={(e) => setForm({ ...form, downlineId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  required type="number" min="1" step="0.01" className="input" placeholder="5000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <select
                  className="input" value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                >
                  <option value="">Select bank</option>
                  {banks.map((b: { name: string; code: string }) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  className="input" placeholder="0123456789"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  className="input" placeholder="Account holder name"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  className="input" rows={2} placeholder="Purpose of withdrawal"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reject Withdrawal</h2>
            <textarea
              className="input mb-4" rows={3} placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="btn-danger flex-1"
              >
                Reject
              </button>
              <button onClick={() => setRejectId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-gray-500">No withdrawal requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: {
            id: string; amount: number; status: string; reason?: string;
            createdAt: string; approvedAt?: string;
            initiator: { id: string; name: string; email: string };
            downline: { id: string; name: string; email: string };
            approver?: { name: string };
            bankName?: string; accountNumber?: string; accountName?: string;
          }) => (
            <div key={w.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(w.amount)}</span>
                    <span className={statusBadge[w.status] || 'badge bg-gray-100'}>
                      {w.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      <span className="font-medium">Initiated by:</span> {w.initiator.name} ({w.initiator.email})
                    </p>
                    <p>
                      <span className="font-medium">Wallet owner:</span> {w.downline.name} ({w.downline.email})
                    </p>
                    {w.reason && <p><span className="font-medium">Reason:</span> {w.reason}</p>}
                    {w.accountNumber && (
                      <p><span className="font-medium">Bank:</span> {w.accountName} · {w.accountNumber}</p>
                    )}
                    {w.approver && <p><span className="font-medium">Approved by:</span> {w.approver.name}</p>}
                    <p className="text-xs text-gray-400">
                      Created: {format(new Date(w.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {w.status === 'PENDING' && w.downline.id === user?.id && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(w.id)}
                        disabled={approveMutation.isPending}
                        className="btn-success text-sm px-3 py-1.5"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectId(w.id)}
                        className="btn-danger text-sm px-3 py-1.5"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {w.status === 'APPROVED' && user?.role === 'ADMIN' && (
                    <button
                      onClick={() => processMutation.mutate(w.id)}
                      disabled={processMutation.isPending}
                      className="btn-primary text-sm px-3 py-1.5"
                    >
                      Process Transfer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
