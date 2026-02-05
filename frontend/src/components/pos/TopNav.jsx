import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useBusiness } from './BusinessContext';
import { useCart } from './CartContext';
import { 
  Menu, X, ChevronDown, Store, LogOut, Settings, 
  BarChart3, Package, ShoppingCart, Wifi, WifiOff,
  CreditCard, User
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TopNav({ user, onLogout, currentPage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentBusiness, businesses, selectBusiness } = useBusiness();
  const { isOnline, offlineQueue } = useCart();

  const navItems = [
    { name: 'POS', href: createPageUrl('POS'), icon: ShoppingCart },
    { name: 'Items', href: createPageUrl('Items'), icon: Package },
    { name: 'Reports', href: createPageUrl('Reports'), icon: BarChart3 },
    { name: 'Cash Register', href: createPageUrl('CashRegister'), icon: CreditCard },
    { name: 'Settings', href: createPageUrl('Settings'), icon: Settings },
  ];

  const isCurrentPage = (itemName) => {
    if (!currentPage) return false;
    return currentPage === itemName || (itemName === 'Settings' && currentPage === 'Settings');
  };

  const handleBusinessSwitch = (business) => {
    selectBusiness(business);
    window.location.reload(); // Reload to refresh business-scoped data
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-14">
          {/* Logo & Business Selector */}
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('POS')} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-900 hidden sm:block">QuickPOS</span>
            </Link>

            {currentBusiness && businesses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-sm">
                    <span className="max-w-[150px] truncate">{currentBusiness.name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {businesses.map((business) => (
                    <DropdownMenuItem 
                      key={business.id}
                      onClick={() => handleBusinessSwitch(business)}
                      className={currentBusiness?.id === business.id ? 'bg-blue-50' : ''}
                    >
                      <Store className="w-4 h-4 mr-2" />
                      {business.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  isCurrentPage(item.name) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Network indicator */}
            <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {offlineQueue.length > 0 && (
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-xs">
                  {offlineQueue.length} queued
                </span>
              )}
            </div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="hidden sm:block text-sm">{user?.name || user?.full_name || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Business Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                  isCurrentPage(item.name)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
