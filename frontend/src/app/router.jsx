import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';
import CustomersPage from '../features/customers/CustomersPage.jsx';
import CustomerDetailsPage from '../features/customers/CustomerDetailsPage.jsx';
import OrdersPage from '../features/orders/OrdersPage.jsx';
import CreateOrderPage from '../features/orders/CreateOrderPage.jsx';
import OrderDetailsPage from '../features/orders/OrderDetailsPage.jsx';
import FinancePage from '../features/finance/FinancePage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import ProductsPage from '../features/products/ProductsPage.jsx';
import SettingsPage from '../features/settings/SettingsPage.jsx';
import ReportsPage from '../features/reports/ReportsPage.jsx';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailsPage />} />
        <Route path="inventory" element={<ProductsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}