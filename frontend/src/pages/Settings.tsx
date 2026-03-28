import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const mutation = useMutation({
    mutationFn: () =>
      authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile info */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Full Name</p>
            <p className="text-gray-900 font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Role</p>
            <p className="text-gray-900">{user?.role}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Subscription</p>
            <p className="text-gray-900">
              {user?.subscriptionEnd && new Date(user.subscriptionEnd) > new Date()
                ? `Active until ${new Date(user.subscriptionEnd).toLocaleDateString()}`
                : user?.role === 'ADMIN'
                ? 'Admin (no subscription required)'
                : 'Expired - contact admin to renew'}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password" required className="input max-w-sm"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password" required minLength={8} className="input max-w-sm"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password" required minLength={8} className="input max-w-sm"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
