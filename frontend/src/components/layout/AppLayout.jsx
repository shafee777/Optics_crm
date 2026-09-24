import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import logo from '../../assets/logo.png';
import { 
  Glasses, 
  Users, 
  ShoppingBag, 
  LayoutDashboard, 
  IndianRupee, 
  LogOut, 
  Store,
  ShieldCheck,
  Receipt,
  Package,
  Settings,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, isOwner } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Orders', href: '/orders', icon: ShoppingBag },
    { name: 'Inventory', href: '/inventory', icon: Package }, 
    ...(isOwner
      ? [
          { name: 'Finance', href: '/finance', icon: IndianRupee },
          { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
        ]
      : [{ name: 'Record Expenses', href: '/finance', icon: Receipt }]),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F3] text-[#202D2B] flex flex-col font-sans">
      {/* Top Header - Deep Forest */}
      <header className="bg-[#203A36] border-b border-[#182C29] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Brand & Store Badge */}
            <div className="flex items-center gap-3 sm:gap-5">
              <Link to="/" className="flex items-center gap-2.5">
                <img src={logo} alt="Optics CRM Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
                <span className="font-bold text-white text-base tracking-tight hidden sm:block">Optics CRM</span>
              </Link>

              {/* Active Tenant / Store Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#182C29] border border-[#2C4843] rounded-full text-[#A3CCC4] text-xs font-medium max-w-[160px] sm:max-w-none truncate">
                <Store className="w-3.5 h-3.5 shrink-0 text-[#86C9BE]" />
                <span className="truncate">{user?.store?.name || 'My Store'}</span>
              </div>
            </div>

            {/* Desktop Navigation links */}
            <nav className="hidden lg:flex space-x-1 items-center">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                      isActive
                        ? 'bg-[#28766B] text-white shadow-sm'
                        : 'text-[#C4D0CC] hover:bg-[#2B4B46] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: User & Role Badge & Logout & Mobile Hamburger Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight">{user?.fullName}</div>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[#86C9BE]" />
                  <span className="text-[10px] font-bold text-[#86C9BE] uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="hidden sm:block p-2 rounded-xl text-[#A3B8B2] hover:text-white hover:bg-[#2B4B46] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Hamburger Menu Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-[#C4D0CC] hover:text-white hover:bg-[#2B4B46] transition focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Slide-Down Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#182C29] bg-[#1D3531] px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top duration-200">
            {/* User Profile Bar in Mobile Menu */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#182C29] border border-[#2C4843]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#28766B] text-white flex items-center justify-center font-bold text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{user?.fullName}</div>
                  <div className="text-[10px] text-[#A3B8B2]">{user?.email}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#28766B]/30 text-[#86C9BE] border border-[#28766B]/50 uppercase">
                {user?.role}
              </span>
            </div>

            {/* Navigation links */}
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#28766B] text-white font-bold'
                        : 'text-[#C4D0CC] hover:bg-[#2B4B46] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sign Out Button in Mobile Menu */}
            <div className="pt-2 border-t border-[#2C4843]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}