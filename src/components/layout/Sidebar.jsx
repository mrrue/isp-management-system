import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Package,
  Receipt,
  FileText,
  LifeBuoy,
  Wrench,
  DollarSign,
  UserCheck,
  CalendarCheck,
  Shield,
  Settings,
  History,
  HardDriveDownload,
  X,
  Layers,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import Badge from '../common/Badge';

export default function Sidebar({ isOpen, onClose }) {
  const { user, hasPermission, isAdmin } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;
  const isBilling = currentPath.startsWith('/billing') || currentPath === '/reports/billing';
  const isHelpDesk = currentPath.startsWith('/helpdesk') || currentPath === '/reports/technicians';
  const isFinances = currentPath.startsWith('/finances') || currentPath === '/reports/finances';
  const isAttendance = currentPath.startsWith('/attendance') || currentPath === '/reports/attendance';
  const isAdminPortal = currentPath.startsWith('/admin');
  const isHub = currentPath === '/';

  // Permission Checks
  const canBilling = hasPermission('billing_view');
  const canHelpDesk = hasPermission('helpdesk_view');
  const canFinance = hasPermission('finance_view') || user?.role === 'employee';
  const canAttendance = hasPermission('attendance_view') || hasPermission('attendance_clock');
  const canReports = hasPermission('reports_view');
  const canAdmin = isAdmin;

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
      isActive
        ? 'bg-sky-600 text-white font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  // Portal Theme configs
  const getPortalInfo = () => {
    if (isBilling) {
      return {
        title: 'Billing Portal',
        icon: Receipt,
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
        activeColor: 'bg-sky-600 text-white'
      };
    }
    if (isHelpDesk) {
      return {
        title: 'Help Desk Portal',
        icon: LifeBuoy,
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        activeColor: 'bg-amber-600 text-white'
      };
    }
    if (isFinances) {
      return {
        title: 'Finance Portal',
        icon: DollarSign,
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        activeColor: 'bg-emerald-600 text-white'
      };
    }
    if (isAttendance) {
      return {
        title: 'Attendance Portal',
        icon: CalendarCheck,
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        activeColor: 'bg-indigo-600 text-white'
      };
    }
    if (isAdminPortal) {
      return {
        title: 'Administration',
        icon: Shield,
        badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
        activeColor: 'bg-slate-800 text-white'
      };
    }
    return {
      title: 'Operations Hub',
      icon: LayoutDashboard,
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      activeColor: 'bg-slate-800 text-white'
    };
  };

  const portalInfo = getPortalInfo();
  const PortalIcon = portalInfo.icon;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto no-print ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">⚡</div>
            <span className="font-bold text-sm text-slate-800">Menu</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Portal Banner */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${portalInfo.badgeBg}`}>
                <PortalIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">Active Portal</span>
                <span className="text-xs font-bold text-slate-800 leading-tight">{portalInfo.title}</span>
              </div>
            </div>
            {!isHub && (
              <Link
                to="/"
                onClick={onClose}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-sky-50"
                title="Back to Hub"
              >
                <span>Hub</span> &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Focused Portal Navigation links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {/* Main Dashboard / Hub Link */}
          <div>
            <NavLink to="/" end className={navItemClass} onClick={onClose}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Operations Hub</span>
            </NavLink>
          </div>

          {/* 1. BILLING PORTAL VIEW */}
          {(isBilling || isHub) && canBilling && (
            <div className={isHub ? 'border-t border-slate-100 pt-3' : ''}>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billing & Customers
                </p>
                {isHub && (
                  <Link to="/billing/customers" className="text-[10px] text-sky-600 font-bold hover:underline">
                    Enter &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                <NavLink to="/billing/customers" className={navItemClass} onClick={onClose}>
                  <Users className="w-4 h-4" />
                  <span>Customers Directory</span>
                </NavLink>
                <NavLink to="/billing/payments" className={navItemClass} onClick={onClose}>
                  <Receipt className="w-4 h-4" />
                  <span>Payments & WhatsApp Slips</span>
                </NavLink>
                <NavLink to="/billing/packages" className={navItemClass} onClick={onClose}>
                  <Package className="w-4 h-4" />
                  <span>ISP Packages & Tariffs</span>
                </NavLink>
                {canReports && (
                  <NavLink to="/reports/billing" className={navItemClass} onClick={onClose}>
                    <FileText className="w-4 h-4" />
                    <span>Billing & Revenue Reports</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* 2. HELP DESK / TICKETING PORTAL VIEW */}
          {(isHelpDesk || isHub) && canHelpDesk && (
            <div className={isHub ? 'border-t border-slate-100 pt-3' : ''}>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Help Desk & Complaints
                </p>
                {isHub && (
                  <Link to="/helpdesk/tickets" className="text-[10px] text-amber-600 font-bold hover:underline">
                    Enter &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                <NavLink to="/helpdesk/tickets" end className={navItemClass} onClick={onClose}>
                  <LifeBuoy className="w-4 h-4" />
                  <span>All Complaints Queue</span>
                </NavLink>
                {user?.role === 'employee' && (
                  <NavLink to="/helpdesk/my-tickets" className={navItemClass} onClick={onClose}>
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>My Assigned Jobs</span>
                  </NavLink>
                )}
                {canReports && (
                  <NavLink to="/reports/technicians" className={navItemClass} onClick={onClose}>
                    <FileText className="w-4 h-4" />
                    <span>Technician Reports</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* 3. FINANCES / EXPENSES PORTAL VIEW */}
          {(isFinances || isHub) && canFinance && (
            <div className={isHub ? 'border-t border-slate-100 pt-3' : ''}>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Finances & Expenses
                </p>
                {isHub && (
                  <Link to="/finances/expenses" className="text-[10px] text-emerald-600 font-bold hover:underline">
                    Enter &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                <NavLink to="/finances/expenses" className={navItemClass} onClick={onClose}>
                  <DollarSign className="w-4 h-4" />
                  <span>Expense Records</span>
                </NavLink>
                {canReports && (
                  <NavLink to="/reports/finances" className={navItemClass} onClick={onClose}>
                    <FileText className="w-4 h-4" />
                    <span>Finance & Spending Reports</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* 4. ATTENDANCE PORTAL VIEW */}
          {(isAttendance || isHub) && canAttendance && (
            <div className={isHub ? 'border-t border-slate-100 pt-3' : ''}>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Staff Attendance
                </p>
                {isHub && (
                  <Link to="/attendance/clock" className="text-[10px] text-indigo-600 font-bold hover:underline">
                    Enter &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                <NavLink to="/attendance/clock" className={navItemClass} onClick={onClose}>
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Clock In / Clock Out</span>
                </NavLink>
                {(isAdmin || hasPermission('attendance_manage')) && (
                  <NavLink to="/attendance/dashboard" className={navItemClass} onClick={onClose}>
                    <UserCheck className="w-4 h-4" />
                    <span>Today's Attendance Board</span>
                  </NavLink>
                )}
                <NavLink to="/attendance/history" className={navItemClass} onClick={onClose}>
                  <History className="w-4 h-4" />
                  <span>Attendance History Logs</span>
                </NavLink>
                {canReports && (
                  <NavLink to="/reports/attendance" className={navItemClass} onClick={onClose}>
                    <FileText className="w-4 h-4" />
                    <span>Attendance Reports</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* 5. ADMINISTRATION VIEW */}
          {(isAdminPortal || isHub) && canAdmin && (
            <div className={isHub ? 'border-t border-slate-100 pt-3' : ''}>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Administration
                </p>
                {isHub && (
                  <Link to="/admin/users" className="text-[10px] text-slate-600 font-bold hover:underline">
                    Enter &rarr;
                  </Link>
                )}
              </div>
              <div className="space-y-0.5">
                <NavLink to="/admin/users" className={navItemClass} onClick={onClose}>
                  <Shield className="w-4 h-4" />
                  <span>Users & Permissions</span>
                </NavLink>
                <NavLink to="/admin/settings" className={navItemClass} onClick={onClose}>
                  <Settings className="w-4 h-4" />
                  <span>System Settings</span>
                </NavLink>
                <NavLink to="/admin/audit" className={navItemClass} onClick={onClose}>
                  <History className="w-4 h-4" />
                  <span>Audit Logs</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* QUICK PORTAL SWITCHER FOOTER (WHEN INSIDE A SPECIFIC PORTAL) */}
          {!isHub && (
            <div className="pt-4 border-t border-slate-200">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3 h-3" /> Switch Portal
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {!isBilling && canBilling && (
                  <Link
                    to="/billing/customers"
                    onClick={onClose}
                    className="p-2 bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-800 rounded-xl border border-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-sky-600" />
                    <span className="truncate">Billing</span>
                  </Link>
                )}
                {!isHelpDesk && canHelpDesk && (
                  <Link
                    to="/helpdesk/tickets"
                    onClick={onClose}
                    className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-xl border border-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate">Help Desk</span>
                  </Link>
                )}
                {!isFinances && canFinance && (
                  <Link
                    to="/finances/expenses"
                    onClick={onClose}
                    className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl border border-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate">Finances</span>
                  </Link>
                )}
                {!isAttendance && canAttendance && (
                  <Link
                    to="/attendance/clock"
                    onClick={onClose}
                    className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 rounded-xl border border-slate-200 flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate">Attendance</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-slate-100 text-center bg-slate-50/50">
          <p className="text-[11px] font-semibold text-slate-700">ISP ERP Suite</p>
          <p className="text-[9px] text-slate-400">Single Login • 4 Dedicated Portals</p>
        </div>
      </aside>
    </>
  );
}
