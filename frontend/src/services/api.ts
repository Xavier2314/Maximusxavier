import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string; role?: string; sponsorId?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};

// Wallet
export const walletAPI = {
  getMyWallet: () => api.get('/wallet/my'),
  getUserWallet: (userId: string) => api.get(`/wallet/user/${userId}`),
  getMyTransactions: (page = 1) => api.get(`/wallet/transactions/my?page=${page}`),
  getUserTransactions: (userId: string, page = 1) =>
    api.get(`/wallet/transactions/${userId}?page=${page}`),
  creditWallet: (data: { userId: string; amount: number; description?: string; reference?: string }) =>
    api.post('/wallet/credit', data),
  lockSavings: (data: { amount: number; lockDays: number }) =>
    api.post('/wallet/savings/lock', data),
  unlockSavings: () => api.post('/wallet/savings/unlock'),
};

// Withdrawals
export const withdrawalAPI = {
  getWithdrawals: (params?: { page?: number; status?: string }) =>
    api.get('/withdrawals', { params }),
  getWithdrawal: (id: string) => api.get(`/withdrawals/${id}`),
  createWithdrawal: (data: {
    downlineId: string;
    amount: number;
    reason?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  }) => api.post('/withdrawals', data),
  approveWithdrawal: (id: string) => api.put(`/withdrawals/${id}/approve`),
  rejectWithdrawal: (id: string, reason?: string) =>
    api.put(`/withdrawals/${id}/reject`, { reason }),
  processWithdrawal: (id: string) => api.put(`/withdrawals/${id}/process`),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: { page?: number; role?: string; search?: string }) =>
    api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  createUser: (data: Record<string, unknown>) => api.post('/admin/users', data),
  renewSubscription: (userId: string, months?: number) =>
    api.post('/admin/subscriptions/renew', { userId, months }),
  getAuditLogs: (page = 1) => api.get(`/admin/audit-logs?page=${page}`),
  getBanks: () => api.get('/admin/banks'),
};

// Notifications
export const notificationAPI = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};
