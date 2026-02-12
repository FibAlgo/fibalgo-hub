'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Shield, Users, CreditCard, Settings, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AdminClientProps {
  user: SupabaseUser;
}

export default function AdminClient({ user }: AdminClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile swipe gesture to open sidebar
  useEffect(() => {
    if (!isMobile) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = Math.abs(touchEndY - touchStartY);
      
      // Swipe right to open sidebar (anywhere on screen, move right 50px+, minimal vertical movement)
      if (diffX > 50 && diffY < 100 && !sidebarOpen) {
        setSidebarOpen(true);
      }
      // Swipe left to close sidebar
      if (diffX < -50 && diffY < 100 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, sidebarOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/90 border-r border-white/10 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-500 bg-clip-text text-transparent">
              FibAlgo
            </span>
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">ADMIN</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-purple-500/20 text-purple-400' : 'text-white/70 hover:bg-white/5'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-cyan-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-purple-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-black/90 border-b border-white/10 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-white/70">
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-semibold">Admin Panel</span>
        </header>

        <main className="p-6 lg:p-8 mt-16 lg:mt-0">
          {activeTab === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-white/50 text-sm mb-2">Total Users</h3>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-white/50 text-sm mb-2">Active Subscriptions</h3>
                  <p className="text-3xl font-bold">0</p>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-white/50 text-sm mb-2">Revenue (Monthly)</h3>
                  <p className="text-3xl font-bold">$0</p>
                </div>
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="text-white/50 text-sm mb-2">Pending Tickets</h3>
                  <p className="text-3xl font-bold">0</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Users</h1>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/60">No users found.</p>
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/60">No subscriptions found.</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h1 className="text-2xl font-bold mb-6">Settings</h1>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <h2 className="text-lg font-semibold mb-4">System Settings</h2>
                <p className="text-white/60">Configure your application settings here.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
