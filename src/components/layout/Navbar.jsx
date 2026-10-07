import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Clock,
  LogOut,
  User,
  Shield,
  CheckCheck,
  Menu,
  PhoneCall,
  Search,
  Receipt,
  LifeBuoy,
  DollarSign,
  CalendarCheck,
  LayoutDashboard,
  Layers
} from 'lucide-react';
import Badge from '../common/Badge';

export default function Navbar({ onMenuToggle }) {
  const { user, logout, settings, hasPermission, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const bizName = settings?.business_info?.name || 'ISP Manager Pro';

  const currentPath = location.pathname;
  const isBilling = currentPath.startsWith('/billing') || currentPath === '/reports/billing';
  const isHelpDesk = currentPath.startsWith('/helpdesk') || currentPath === '/reports/technicians';
  const isFinances = currentPath.startsWith('/finances') || currentPath === '/reports/finances';
  const isAttendance = currentPath.startsWith('/attendance') || currentPath === '/reports/attendance';
  const isAdminPortal = currentPath.startsWith('/admin');
  const isHub = currentPath === '/';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2">
        {/* Left: Mobile Menu & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden focus:outline-none"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              ⚡
            </div>
            <div className="hidden md:block">
              <h1 className="text-sm font-bold text-slate-900 leading-tight">{bizName}</h1>
              <p className="text-[10px] text-slate-500 font-medium">ISP Multi-Portal Suite</p>
            </div>
          </Link>
        </div>

        {/* Center: 4 Dedicated Portals Switcher */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isHub
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Hub</span>
          </Link>

          {hasPermission('billing_view') && (
            <Link
              to="/billing/customers"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isBilling
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-sky-700 hover:bg-sky-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>1. Billing Portal</span>
            </Link>
          )}

          {hasPermission('helpdesk_view') && (
            <Link
              to="/helpdesk/tickets"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isHelpDesk
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>2. Help Desk Portal</span>
            </Link>
          )}

          {(hasPermission('finance_view') || user?.role === 'employee') && (
            <Link
              to="/finances/expenses"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isFinances
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>3. Finance Portal</span>
            </Link>
          )}

          {(hasPermission('attendance_view') || hasPermission('attendance_clock')) && (
            <Link
              to="/attendance/clock"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isAttendance
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>4. Attendance Portal</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/users"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isAdminPortal
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Right Action Icons & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Fast Clock In / Attendance Button for Staff */}
          <Link
            to="/attendance/clock"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xs:inline">Clock In/Out</span>
          </Link>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) {
                            navigate(n.link);
                            setShowNotifications(false);
                          }
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${n.is_read ? 'opacity-60' : 'bg-sky-50/40'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">{user?.full_name}</p>
                <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">
                  {user?.role}
                </span>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-500">{user?.designation || user?.role}</p>
                  <div className="mt-1.5">
                    <Badge variant={user?.role === 'admin' ? 'danger' : user?.role === 'manager' ? 'primary' : 'default'} size="sm">
                      {user?.role?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    Admin Settings
                  </Link>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
