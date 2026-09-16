import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../features/auth/LoginPage.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import { ProtectedRoute } from '../components/common/ProtectedRoute.jsx';

// Placeholder views for next steps
const DashboardPlaceholder = () => (
  <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
    <h2 className="text-xl font-bold text-slate-800">Operational Dashboard</h2>
    <p className="text-slate-500 text-sm mt-1">Ready for Step 5 (Customers) and Step 9 (Dashboard metrics)!</p>
  </div>
);

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
        <Route index element={<DashboardPlaceholder />} />
        <Route path="customers" element={<Navigate to="/" replace />} />
        <Route path="orders" element={<Navigate to="/" replace />} />
        <Route path="finance" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}