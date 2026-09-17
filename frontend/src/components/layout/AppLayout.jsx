import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { 
  Glasses, 
  Users, 
  ShoppingBag, 
  LayoutDashboard, 
  IndianRupee, 
  LogOut, 
  Store,
  ShieldCheck,
  Receipt
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, isOwner } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    ...(isOwner
      ? [{ name: 'Finance & Analytics', href: '/finance', icon: IndianRupee }]
      : [{ name: 'Record Expenses', href: '/finance', icon: Receipt }]),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Brand & Store Badge */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Glasses className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-900 text-lg hidden sm:block">Optical Growth CRM</span>
              </Link>

              {/* Active Tenant / Store Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
                <Store className="w-3.5 h-3.5" />
                <span>{user?.store?.name || 'My Store'}</span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex space-x-1 items-center">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-100 text-indigo-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: User & Role Badge & Logout */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-800">{user?.fullName}</div>
                <div className="flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}