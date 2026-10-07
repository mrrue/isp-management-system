import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/Login';

// Main Dashboard
import Dashboard from './pages/Dashboard';

// Billing Pages
import CustomersList from './pages/billing/CustomersList';
import CustomerDetail from './pages/billing/CustomerDetail';
import PackagesList from './pages/billing/PackagesList';
import PaymentsList from './pages/billing/PaymentsList';
import BillingReports from './pages/billing/BillingReports';

// Help Desk Pages
import TicketsList from './pages/helpdesk/TicketsList';
import TicketDetail from './pages/helpdesk/TicketDetail';
import TechnicianPortal from './pages/helpdesk/TechnicianPortal';
import HelpDeskReports from './pages/helpdesk/HelpDeskReports';

// Finances Pages
import ExpensesList from './pages/finances/ExpensesList';
import EmployeeLedger from './pages/finances/EmployeeLedger';
import FinanceReports from './pages/finances/FinanceReports';

// Attendance Pages
import ClockInOut from './pages/attendance/ClockInOut';
import AttendanceDashboard from './pages/attendance/AttendanceDashboard';
import AttendanceHistory from './pages/attendance/AttendanceHistory';
import AttendanceReports from './pages/attendance/AttendanceReports';

// Admin Pages
import UsersList from './pages/admin/UsersList';
import Settings from './pages/admin/Settings';
import AuditLogs from './pages/admin/AuditLogs';

// Protected Route Guard
function ProtectedRoute({ children, permission, adminOnly = false }) {
  const { user, hasPermission, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              {/* Billing Portal */}
              <Route path="billing/customers" element={<CustomersList />} />
              <Route path="billing/customers/:id" element={<CustomerDetail />} />
              <Route path="billing/packages" element={<PackagesList />} />
              <Route path="billing/payments" element={<PaymentsList />} />
              <Route path="reports/billing" element={<BillingReports />} />

              {/* Help Desk Portal */}
              <Route path="helpdesk/tickets" element={<TicketsList />} />
              <Route path="helpdesk/tickets/:id" element={<TicketDetail />} />
              <Route path="helpdesk/my-tickets" element={<TechnicianPortal />} />
              <Route path="reports/technicians" element={<HelpDeskReports />} />

              {/* Finances Portal */}
              <Route path="finances/expenses" element={<ExpensesList />} />
              <Route path="finances/employee/:id" element={<EmployeeLedger />} />
              <Route path="reports/finances" element={<FinanceReports />} />

              {/* Attendance Portal */}
              <Route path="attendance/clock" element={<ClockInOut />} />
              <Route path="attendance/dashboard" element={<AttendanceDashboard />} />
              <Route path="attendance/history" element={<AttendanceHistory />} />
              <Route path="reports/attendance" element={<AttendanceReports />} />

              {/* Administration */}
              <Route path="admin/users" element={<ProtectedRoute adminOnly><UsersList /></ProtectedRoute>} />
              <Route path="admin/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
              <Route path="admin/audit" element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
