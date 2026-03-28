import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationAPI } from '../services/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', roles: ['DOWNLINE', 'SPONSOR', 'UPLINE', 'ADMIN'], icon: '📊' },
  { path: '/withdrawals', label: 'Withdrawals', roles: ['DOWNLINE', 'SPONSOR', 'ADMIN'], icon: '💸' },
  { path: '/wallet', label: 'Wallet', roles: ['DOWNLINE', 'SPONSOR', 'ADMIN'], icon: '💰' },
  { path: '/admin', label: 'Admin Panel', roles: ['ADMIN'], icon: '⚙️' },
  { path: '/admin/users', label: 'Users', roles: ['ADMIN'], icon: '👥' },
  { path: '/admin/audit', label: 'Audit Logs', roles: ['ADMIN'], icon: '📋' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationAPI.getNotifications(1),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.data?.data?.unreadCount || 0;
  const userNavItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    SPONSOR: 'bg-purple-100 text-purple-700',
    DOWNLINE: 'bg-blue-100 text-blue-700',
    UPLINE: 'bg-green-100 text-green-700',
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h1 className="text-lg font-bold text-blue-700">FreelanceFund</h1>
              <p className="text-xs text-gray-400">Fund Control Platform</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <span className={`badge text-xs ${roleColors[user?.role || ''] || 'bg-gray-100 text-gray-600'}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {userNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="px-3 py-4 border-t border-gray-100 space-y-1">
            <Link
              to="/notifications"
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <span className="flex items-center gap-3">
                <span>🔔</span> Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <span>⚙️</span> Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            ☰
          </button>
          <div className="flex items-center gap-3 ml-auto">
            {!user?.subscriptionEnd || new Date(user.subscriptionEnd) < new Date() ? (
              user?.role !== 'ADMIN' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  ⚠️ Subscription expired
                </span>
              )
            ) : (
              <span className="text-xs text-gray-400">
                Active until {new Date(user.subscriptionEnd).toLocaleDateString()}
              </span>
            )}
            <Link to="/notifications" className="relative">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
