'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { appConfig } from '@/lib/config';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Crown,
  Clock,
  DollarSign,
  UserPlus,
  Home,
  Search,
  Plus,
  Calendar,
  Mail,
  Check,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  Edit,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Tv,
  ArrowDown,
  XCircle,
  MessageCircle,
  Camera,
  Loader2,
  Send,
  Ban,
  ShieldOff
} from 'lucide-react';
import { 
  addMessageToTicket,
  updateTicketStatus,
  type AppUser,
  type PaymentMethod,
  type SupportTicket
} from '@/lib/store';

// Helper component for account type badges
function AccountTypeBadges({ user }: { user: AppUser }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.4rem' }}>
      {user.accountType === 'google' ? (
        <span style={{ 
          fontSize: '0.55rem', 
          padding: '0.1rem 0.35rem', 
          borderRadius: '9999px', 
          background: 'rgba(234,67,53,0.15)', 
          color: '#ea4335', 
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.15rem'
        }}>
          <svg style={{ width: '7px', height: '7px' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          G
        </span>
      ) : (
        <>
          <span style={{ 
            fontSize: '0.55rem', 
            padding: '0.1rem 0.35rem', 
            borderRadius: '9999px', 
            background: 'rgba(156,163,175,0.15)', 
            color: '#9ca3af', 
            fontWeight: 600 
          }}>
            ✉
          </span>
          {user.emailVerified && (
            <span style={{ 
              fontSize: '0.55rem', 
              padding: '0.1rem 0.35rem', 
              borderRadius: '9999px', 
              background: 'rgba(34,197,94,0.15)', 
              color: '#22c55e', 
              fontWeight: 600 
            }}>
              ✓
            </span>
          )}
        </>
      )}
    </span>
  );
}

interface AdminDashboardClientProps {
  userId: string;
}

export default function AdminDashboardClient({ userId }: AdminDashboardClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  
  // Exchange rates state
  const [usdToTry, setUsdToTry] = useState(35.50);
  const [eurToTry, setEurToTry] = useState(38.20);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesLastUpdate, setRatesLastUpdate] = useState<string>('');
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  
  // Admin TradingView edit state
  const [editTradingViewId, setEditTradingViewId] = useState('');
  const [savingTradingViewId, setSavingTradingViewId] = useState(false);
  const [editAdminNote, setEditAdminNote] = useState('');
  const [savingAdminNote, setSavingAdminNote] = useState(false);
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserTradingView, setNewUserTradingView] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'premium' | 'ultimate' | 'lifetime'>('premium');
  const [subscriptionDays, setSubscriptionDays] = useState('30');
  const [subscriptionAmount, setSubscriptionAmount] = useState('$49.99');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('crypto');
  const [extendDays, setExtendDays] = useState('30');
  const [extendAmount, setExtendAmount] = useState('$49.99');
  const [extendPaymentMethod, setExtendPaymentMethod] = useState<PaymentMethod>('crypto');

  // Support ticket state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  // Prevent polling/realtime from "re-opening" a ticket after admin goes back to list
  const selectedTicketIdRef = useRef<string | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [ticketAttachmentUrl, setTicketAttachmentUrl] = useState<string | null>(null);
  const [ticketAttachmentUploading, setTicketAttachmentUploading] = useState(false);
  const [ticketReplySending, setTicketReplySending] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState<any[]>([]);

  // Banned users state
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banningUser, setBanningUser] = useState(false);

  // TradingView downgrades state
  const [tradingViewDowngrades, setTradingViewDowngrades] = useState<any[]>([]);
  const [removingTradingView, setRemovingTradingView] = useState<string | null>(null);

  // TradingView upgrades state (pending access grants)
  const [tradingViewUpgrades, setTradingViewUpgrades] = useState<any[]>([]);
  const [grantingTradingView, setGrantingTradingView] = useState<string | null>(null);
  const [editTradingViewIdUpgrade, setEditTradingViewIdUpgrade] = useState<string>('');

  // App Settings state
  const [appSettings, setAppSettings] = useState<{ news_api_enabled: boolean }>({ news_api_enabled: true });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Messages scroll ref - auto scroll to bottom only when a NEW message is added
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Viewer timezone (admin-side)
  const viewerTimeZone = useMemo(() => {
    if (typeof window === 'undefined') return 'UTC';
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }, []);

  const formatTicketDateTime = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { timeZone: viewerTimeZone });
    } catch {
      return iso;
    }
  }, [viewerTimeZone]);

  const formatTicketDate = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { timeZone: viewerTimeZone });
    } catch {
      return iso;
    }
  }, [viewerTimeZone]);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicket?.id ?? null;
  }, [selectedTicket?.id]);

  // Auto-scroll only when message count increases (new message), NOT on every poll/refresh
  useEffect(() => {
    const count = selectedTicket?.messages?.length ?? 0;
    if (selectedTicket && messagesEndRef.current && count > prevMessageCountRef.current) {
      prevMessageCountRef.current = count;
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (selectedTicket) {
      prevMessageCountRef.current = count;
    }
  }, [selectedTicket?.messages?.length, selectedTicket?.id]);

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

  // Fetch app settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await fetch('/api/admin/settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setAppSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Fetch exchange rates from API
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        setRatesLoading(true);
        // Use server endpoint to avoid CORS/blocked requests
        const response = await fetch('/api/exchange-rates');
        if (response.ok) {
          const data = await response.json();
          // API returns rates FROM TRY, we need TO TRY, so we invert
          if (data?.rates?.USD && data?.rates?.EUR) {
            setUsdToTry(1 / data.rates.USD);
            setEurToTry(1 / data.rates.EUR);
            setRatesLastUpdate(new Date().toLocaleTimeString('tr-TR'));
          }
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Keep default values if API fails
      } finally {
        setRatesLoading(false);
      }
    };

    fetchExchangeRates();
    // Refresh rates every 30 minutes
    const interval = setInterval(fetchExchangeRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Update currency when payment method changes - always USD
  useEffect(() => {
    const currentValue = subscriptionAmount.replace(/[^0-9.]/g, '');
    setSubscriptionAmount(`$${currentValue || '49.99'}`);
  }, [paymentMethod]);

  // Auto-update price when plan is selected (using config prices) - always USD
  useEffect(() => {
    const planPrices: Record<string, number> = {
      premium: appConfig.plans.premium.price,  // 49.99
      ultimate: appConfig.plans.ultimate.price, // 99.99
      lifetime: 369.99, // One-time payment
    };
    const price = planPrices[selectedPlan] || 0;
    setSubscriptionAmount(`$${price.toFixed(2)}`);
    
    // Auto-set days for lifetime
    if (selectedPlan === 'lifetime') {
      setSubscriptionDays('36500'); // 100 years
    } else if (subscriptionDays === '36500') {
      setSubscriptionDays('30'); // Reset to 30 days
    }
  }, [selectedPlan]);

  useEffect(() => {
    const currentValue = extendAmount.replace(/[^0-9.]/g, '');
    setExtendAmount(`$${currentValue || '49.99'}`);
  }, [extendPaymentMethod]);

  // Sync editTradingViewId when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setEditTradingViewId(selectedUser.tradingViewId || '');
      setEditAdminNote(selectedUser.adminNote || '');
    }
  }, [selectedUser]);

  // Load users
  useEffect(() => {
    loadUsers();
    loadTickets();
    loadBannedUsers();
    loadTradingViewDowngrades();
    loadTradingViewUpgrades();
  }, []);

  // Realtime updates (no refresh required)
  useEffect(() => {
    const supabase = createClient();

    const usersChannel = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        loadUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_history' }, () => {
        loadUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancellation_requests' }, () => {
        loadUsers();
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel('admin-ticket-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, () => {
        loadTickets();
      })
      .subscribe();

    const refundsChannel = supabase
      .channel('admin-refund-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests' }, async () => {
        const refundsResponse = await fetch('/api/admin/refunds');
        if (refundsResponse.ok) {
          const data = await refundsResponse.json();
          setPendingRefunds(Array.isArray(data) ? data : []);
        }
      })
      .subscribe();

    // TradingView realtime updates
    const tradingViewChannel = supabase
      .channel('admin-tradingview-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tradingview_upgrades' }, () => {
        loadTradingViewUpgrades();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tradingview_downgrades' }, () => {
        loadTradingViewDowngrades();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(refundsChannel);
      supabase.removeChannel(tradingViewChannel);
    };
  }, []);

  // Polling for live ticket updates while on dashboard
  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch('/api/tickets?status=all');
        if (response.ok) {
          const allTickets = await response.json();
          setTickets(allTickets);
          // Update selected ticket if it is still selected (ref avoids stale closure reopening)
          const selectedId = selectedTicketIdRef.current;
          if (selectedId) {
            const updated = allTickets.find((t: SupportTicket) => t.id === selectedId);
            if (updated) setSelectedTicket(updated);
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    // Poll immediately on mount
    pollMessages();
    
    const pollInterval = setInterval(pollMessages, 3000); // Every 3 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Polling for user updates (backup for realtime) - always poll regardless of tab
  useEffect(() => {
    // Poll immediately on mount
    loadUsers();
    
    const pollInterval = setInterval(loadUsers, 3000); // Every 3 seconds
    return () => clearInterval(pollInterval);
  }, [userId]);

  // Polling for TradingView updates (backup for realtime)
  useEffect(() => {
    if (activeTab !== 'tradingview') return;
    
    // Poll immediately when tab is opened
    loadTradingViewUpgrades();
    loadTradingViewDowngrades();
    
    const pollInterval = setInterval(() => {
      loadTradingViewUpgrades();
      loadTradingViewDowngrades();
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [activeTab]);

  // Save TradingView ID for user (admin only)
  const handleSaveTradingViewId = async () => {
    if (!selectedUser) return;
    
    setSavingTradingViewId(true);
    try {
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          tradingViewId: editTradingViewId.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'TradingView ID kaydedilemedi'));
        return;
      }

      // Update local state
      setSelectedUser({ ...selectedUser, tradingViewId: editTradingViewId.trim() || undefined });
      await loadUsers();
      alert('TradingView ID başarıyla güncellendi!');
    } catch (error) {
      console.error('Error saving TradingView ID:', error);
      alert('Bir hata oluştu');
    } finally {
      setSavingTradingViewId(false);
    }
  };

  const handleSaveAdminNote = async () => {
    if (!selectedUser) return;

    setSavingAdminNote(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          adminNote: editAdminNote?.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Admin notu kaydedilemedi'));
        return;
      }

      setSelectedUser({ ...selectedUser, adminNote: editAdminNote?.trim() || '' });
      await loadUsers();
      alert('Admin notu kaydedildi!');
    } catch (error) {
      console.error('Error saving admin note:', error);
      alert('Bir hata oluştu');
    } finally {
      setSavingAdminNote(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      
      if (response.ok) {
        const allUsers = await response.json();
        // Show all users (admins can see everyone)
        setUsers(allUsers);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load users:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/tickets?status=all');
      if (response.ok) {
        const allTickets = await response.json();
        setTickets(allTickets);
        // Update selected ticket if it is still selected (ref avoids stale closure reopening)
        const selectedId = selectedTicketIdRef.current;
        if (selectedId) {
          const updated = allTickets.find((t: SupportTicket) => t.id === selectedId);
          if (updated) setSelectedTicket(updated);
        }
      } else {
        console.error('Failed to load tickets');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const loadBannedUsers = async () => {
    try {
      const response = await fetch('/api/admin/ban');
      if (response.ok) {
        const data = await response.json();
        setBannedUsers(data);
      }
    } catch (error) {
      console.error('Error loading banned users:', error);
    }
  };

  const loadTradingViewDowngrades = async () => {
    try {
      const response = await fetch('/api/admin/tradingview?type=downgrades');
      if (response.ok) {
        const data = await response.json();
        setTradingViewDowngrades(data);
      }
    } catch (error) {
      console.error('Error loading TradingView downgrades:', error);
    }
  };

  const loadTradingViewUpgrades = async () => {
    try {
      const response = await fetch('/api/admin/tradingview?type=upgrades');
      if (response.ok) {
        const data = await response.json();
        setTradingViewUpgrades(data);
      }
    } catch (error) {
      console.error('Error loading TradingView upgrades:', error);
    }
  };

  const handleRemoveTradingViewAccess = async (downgradeId: string) => {
    setRemovingTradingView(downgradeId);
    try {
      const response = await fetch(`/api/admin/tradingview?id=${downgradeId}&adminId=${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadTradingViewDowngrades();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing TradingView access:', error);
      alert('An error occurred');
    } finally {
      setRemovingTradingView(null);
    }
  };

  const handleGrantTradingViewAccess = async (upgradeId: string, tradingViewId?: string) => {
    setGrantingTradingView(upgradeId);
    try {
      const response = await fetch('/api/admin/tradingview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: upgradeId,
          adminId: userId,
          tradingViewId: tradingViewId || null,
        }),
      });
      if (response.ok) {
        loadTradingViewUpgrades();
        loadUsers(); // Refresh user list in case TradingView ID was updated
        setEditTradingViewIdUpgrade('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error granting TradingView access:', error);
      alert('An error occurred');
    } finally {
      setGrantingTradingView(null);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setBanningUser(true);
    try {
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          reason: banReason || 'Kullanım koşullarını ihlal',
          adminId: userId,
        }),
      });
      if (response.ok) {
        alert('Kullanıcı başarıyla banlandı');
        setShowBanModal(false);
        setShowUserDetailModal(false);
        setBanReason('');
        loadUsers();
        loadBannedUsers();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Bir hata oluştu');
    } finally {
      setBanningUser(false);
    }
  };

  const handleUnbanUser = async (targetUserId: string) => {
    if (!confirm('Bu kullanıcının banını kaldırmak istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/admin/ban?userId=${targetUserId}&adminId=${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        alert('Kullanıcı banı kaldırıldı');
        loadUsers();
        loadBannedUsers();
      } else {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleLogout = async () => {
    // Sign out from Supabase
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    
    router.push('/login');
    router.refresh();
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.tradingViewId?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPlan = filterPlan === 'all' || user.subscription.plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  // Stats - with currency conversion to TRY (using live rates from API)
  const totalUsers = users.length;
  const activeSubscriptions = users.filter(u => u.subscription.plan !== 'basic').length;
  
  // Calculate total revenue in TRY
  const totalRevenueTRY = users.reduce((sum, u) => {
    return sum + u.billingHistory.reduce((bSum, b) => {
      const amountStr = b.amount.replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      // Check currency based on payment method
      if (b.paymentMethod === 'credit_card') {
        return bSum + (amount * eurToTry); // EUR to TRY
      } else {
        return bSum + (amount * usdToTry); // USD to TRY
      }
    }, 0);
  }, 0);

  const getLatestBilling = (history: AppUser['billingHistory']) => {
    if (!history || history.length === 0) return null;
    return [...history].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    })[0];
  };

  // This month's expected revenue (subscriptions ending this month)
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const thisMonthExpectedTRY = users.reduce((sum, u) => {
    if (u.subscription.plan === 'basic') return sum;
    if (!u.subscription.endDate) return sum;
    const endDate = new Date(u.subscription.endDate);
    if (Number.isNaN(endDate.getTime())) return sum;

    const startOfEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (startOfEnd < startOfToday) return sum;

    if (endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear()) {
      const lastBilling = getLatestBilling(u.billingHistory);
      if (lastBilling) {
        const amountStr = lastBilling.amount.replace(/[^0-9.]/g, '');
        const amount = parseFloat(amountStr) || 0;
        if (lastBilling.paymentMethod === 'credit_card') {
          return sum + (amount * eurToTry);
        } else {
          return sum + (amount * usdToTry);
        }
      }
    }
    return sum;
  }, 0);

  // Today's expected revenue (subscriptions ending today)
  const todayExpectedTRY = users.reduce((sum, u) => {
    if (u.subscription.plan === 'basic') return sum;
    if (!u.subscription.endDate) return sum;
    if (u.subscription.endDate === today) {
      const lastBilling = getLatestBilling(u.billingHistory);
      if (lastBilling) {
        const amountStr = lastBilling.amount.replace(/[^0-9.]/g, '');
        const amount = parseFloat(amountStr) || 0;
        if (lastBilling.paymentMethod === 'credit_card') {
          return sum + (amount * eurToTry);
        } else {
          return sum + (amount * usdToTry);
        }
      }
    }
    return sum;
  }, 0);

  // Expired subscriptions (daysRemaining < 0 and not basic, OR status is 'expired')
  const expiredSubscriptions = users.filter(u => {
    if (u.subscription.plan === 'basic' || u.subscription.plan === 'lifetime') return false;
    // Include if status is expired OR days remaining < 0
    return u.subscription.status === 'expired' || u.subscription.daysRemaining < 0;
  });

  // Expiring today
  const expiringToday = users.filter(u => {
    if (u.subscription.plan === 'basic' || u.subscription.plan === 'lifetime') return false;
    return u.subscription.endDate === today;
  });

  // Pending cancellation requests state
  const [pendingCancellations, setPendingCancellations] = useState<AppUser[]>([]);

  // Load pending cancellations
  useEffect(() => {
    const loadCancellations = async () => {
      try {
        // Filter users who have pending cancellation requests
        const usersWithCancellations = users.filter(u => u.cancellationRequest?.status === 'pending');
        setPendingCancellations(usersWithCancellations);
      } catch (error) {
        console.error('Error loading cancellations:', error);
      }
    };
    loadCancellations();
    
    // Poll cancellations every 3 seconds
    const pollInterval = setInterval(loadCancellations, 3000);
    return () => clearInterval(pollInterval);
  }, [users]);

  useEffect(() => {
    const loadRefunds = async () => {
      try {
        const response = await fetch('/api/admin/refunds');
        if (response.ok) {
          const data = await response.json();
          setPendingRefunds(Array.isArray(data) ? data : []);
        } else {
          setPendingRefunds([]);
        }
      } catch (error) {
        console.error('Error loading refunds:', error);
        setPendingRefunds([]);
      }
    };

    loadRefunds();
    
    // Poll refunds every 3 seconds
    const pollInterval = setInterval(loadRefunds, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  const newUsersThisMonth = users.filter(u => {
    const createdDate = new Date(u.createdAt);
    return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
  }).length;

  // Today's new users
  const todayStr = now.toISOString().split('T')[0];
  const newUsersToday = users.filter(u => u.createdAt === todayStr).length;

  // Last 7 days registration data for chart
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
    const count = users.filter(u => u.createdAt === dateStr).length;
    return { date: dateStr, day: dayName, count };
  });
  const maxCount = Math.max(...last7DaysData.map(d => d.count), 1);

  // Handle add user
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserName || !newUserTradingView) {
      alert('E-posta, isim ve TradingView kullanıcı adı zorunludur!');
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim().toLowerCase(),
          fullName: newUserName.trim(),
          tradingViewId: newUserTradingView.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert('Hata: ' + (error.error || 'Kullanıcı oluşturulamadı'));
        return;
      }

      await loadUsers();
      setNewUserEmail('');
      setNewUserName('');
      setNewUserTradingView('');
      setShowAddUserModal(false);
      alert('Kullanıcı davet edildi!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Bir hata oluştu');
    }
  };

  // Handle add subscription (only pro or enterprise, with payment method)
  const handleAddSubscription = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          plan: selectedPlan,
          days: parseInt(subscriptionDays, 10) || 0,
          amount: subscriptionAmount,
          paymentMethod: paymentMethod,
          adminEmail: 'admin@fibalgo.com',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Abonelik eklenemedi'));
        return;
      }
      
      // Close modal first
      setShowSubscriptionModal(false);
      setSelectedUser(null);
      
      // Force refresh users immediately and again after a short delay
      await loadUsers();
      setTimeout(() => loadUsers(), 500);
    } catch (error) {
      console.error('Error adding subscription:', error);
      alert('Bir hata oluştu');
    }
  };

  // Handle extend subscription
  const handleExtendSubscription = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          days: parseInt(extendDays, 10) || 0,
          amount: extendAmount,
          paymentMethod: extendPaymentMethod,
          adminEmail: 'admin@fibalgo.com',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Abonelik uzatılamadı'));
        return;
      }
      
      // Close modal first
      setShowExtendModal(false);
      setSelectedUser(null);
      
      // Force refresh users immediately and again after a short delay
      await loadUsers();
      setTimeout(() => loadUsers(), 500);
    } catch (error) {
      console.error('Error extending subscription:', error);
      alert('Bir hata oluştu');
    }
  };

  // Handle downgrade to basic
  const handleDowngradeToBasic = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/admin/subscriptions?userId=${selectedUser.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Düşürme işlemi başarısız'));
        return;
      }
      
      // Close modal first
      setShowDowngradeModal(false);
      setSelectedUser(null);
      
      // Force refresh users and TradingView downgrades (if was Ultimate)
      await loadUsers();
      await loadTradingViewDowngrades();
      setTimeout(() => loadUsers(), 500);
    } catch (error) {
      console.error('Error downgrading:', error);
      alert('Bir hata oluştu');
    }
  };

  // Handle approve cancellation
  const handleApproveCancellation = async (targetUserId: string) => {
    if (confirm('Bu iptal talebini onaylamak istediğinize emin misiniz? Kullanıcının otomatik yenileme kapatılacak ve abonelik süresi dolduğunda Basic plana düşürülecek.')) {
      try {
        const response = await fetch('/api/admin/cancellations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            action: 'approve',
            adminId: userId, // This is the admin's userId from props
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          alert('Hata: ' + (error.error || 'İptal onaylanamadı'));
          return;
        }
        
        await loadUsers();
      } catch (error) {
        console.error('Error approving cancellation:', error);
        alert('Bir hata oluştu');
      }
    }
  };

  // Handle reject cancellation
  const handleRejectCancellation = async (targetUserId: string) => {
    if (confirm('Bu iptal talebini reddetmek istediğinize emin misiniz?')) {
      try {
        const response = await fetch('/api/admin/cancellations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            action: 'reject',
            adminId: userId, // This is the admin's userId from props
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          alert('Hata: ' + (error.error || 'İptal reddedilemedi'));
          return;
        }
        
        await loadUsers();
      } catch (error) {
        console.error('Error rejecting cancellation:', error);
        alert('Bir hata oluştu');
      }
    }
  };

  const handleApproveRefund = async (targetUserId: string) => {
    if (confirm('Bu iade talebini onaylamak istediğinize emin misiniz?')) {
      try {
        const response = await fetch('/api/admin/refunds', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            action: 'approve',
            adminId: userId, // This is the admin's userId from props
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert('Hata: ' + (error.error || 'İade onaylanamadı'));
          return;
        }

        const refundsResponse = await fetch('/api/admin/refunds');
        if (refundsResponse.ok) {
          const data = await refundsResponse.json();
          setPendingRefunds(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error approving refund:', error);
        alert('Bir hata oluştu');
      }
    }
  };

  const handleRejectRefund = async (targetUserId: string) => {
    if (confirm('Bu iade talebini reddetmek istediğinize emin misiniz?')) {
      try {
        const response = await fetch('/api/admin/refunds', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            action: 'reject',
            adminId: userId, // This is the admin's userId from props
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert('Hata: ' + (error.error || 'İade reddedilemedi'));
          return;
        }

        const refundsResponse = await fetch('/api/admin/refunds');
        if (refundsResponse.ok) {
          const data = await refundsResponse.json();
          setPendingRefunds(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error rejecting refund:', error);
        alert('Bir hata oluştu');
      }
    }
  };

  // Handle ticket reply
  const handleTicketReply = async () => {
    // Allow sending with only attachment OR text; prevent duplicate sends
    if (!selectedTicket || (!ticketReply.trim() && !ticketAttachment) || ticketReplySending) return;

    setTicketReplySending(true);
    try {
      let attachmentUrl = null;
      let attachmentPath = null;
      if (ticketAttachment) {
        setTicketAttachmentUploading(true);
        const formData = new FormData();
        formData.append('file', ticketAttachment);
        formData.append('ticketId', selectedTicket.id);
        formData.append('userId', userId);

        const uploadResponse = await fetch('/api/tickets/attachment', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          attachmentUrl = uploadData.attachmentUrl;
          attachmentPath = uploadData.attachmentPath;
        }
        setTicketAttachmentUploading(false);
      }

      const response = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          action: 'addMessage',
          userId: userId, // Admin's user ID
          message: ticketReply,
          attachmentUrl,
          attachmentPath,
          isAdmin: true, // Flag to indicate this is an admin reply
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Mesaj gönderilemedi'));
        return;
      }
      
      await loadTickets();
      // Reload the selected ticket to get updated messages
      const ticketsResponse = await fetch(`/api/tickets?status=all`);
      if (ticketsResponse.ok) {
        const allTickets = await ticketsResponse.json();
        const updated = allTickets.find((t: any) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
      setTicketReply('');
      setTicketAttachment(null);
      setTicketAttachmentUrl(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Bir hata oluştu');
    } finally {
      setTicketReplySending(false);
    }
  };

  // Handle ticket status change
  const handleTicketStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketId,
          action: 'updateStatus',
          status: status,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Hata: ' + (error.error || 'Durum güncellenemedi'));
        return;
      }
      
      await loadTickets();
      // Update selected ticket if it's the one being updated
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Bir hata oluştu');
    }
  };

  // Get filtered tickets
  const filteredTickets = tickets
    .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
    .filter(t => {
      if (!ticketSearch.trim()) return true;
      const search = ticketSearch.toLowerCase();
      return (
        t.subject.toLowerCase().includes(search) ||
        t.userName.toLowerCase().includes(search) ||
        t.userEmail.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      );
    });

  // Ticket stats - calculated from loaded tickets
  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    // Total unread messages for admin (excluding closed/resolved tickets)
    unreadForAdmin: tickets
      .filter(t => t.status !== 'closed' && t.status !== 'resolved')
      .reduce((sum, t) => sum + ((t as any).unreadForAdmin || 0), 0),
  };

  const pendingRefundCount = pendingRefunds.length;
  const pendingCancellationCount = pendingCancellations.length;
  const pendingBillingRequestCount = pendingRefundCount + pendingCancellationCount;
  const pendingBillingBreakdown = [
    pendingRefundCount > 0 ? `${pendingRefundCount} iade` : '',
    pendingCancellationCount > 0 ? `${pendingCancellationCount} iptal` : '',
  ].filter(Boolean).join(' • ');

  // Payment method labels
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    crypto: '₿ Kripto',
    credit_card: '💳 Kredi Kartı',
  };

  const navigation = [
    { name: 'Home', id: 'home', icon: Home, isLink: true, href: '/' },
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'Kullanıcılar', id: 'users', icon: Users },
    { name: 'Abonelikler', id: 'subscriptions', icon: CreditCard },
    { name: 'Süresi Dolmuş', id: 'expired', icon: AlertTriangle },
    { name: 'İptal Talepleri', id: 'cancellations', icon: XCircle },
    { name: 'TradingView', id: 'tradingview', icon: Tv },
    { name: 'Destek Talepleri', id: 'tickets', icon: MessageCircle },
    { name: 'Banlı Kullanıcılar', id: 'banned', icon: Ban },
    { name: 'Ayarlar', id: 'settings', icon: Settings },
  ];

  const planColors: Record<string, string> = {
    basic: '#60a5fa',
    premium: '#00F5FF',
    ultimate: '#A855F7',
    lifetime: '#FFD700',
    hub: '#00F5FF',
    pro: '#A855F7',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0F',
      position: 'relative'
    }}>
      <AnimatedBackground />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
              </div>
              <div>
                <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Yeni Kullanıcı Ekle</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>Süresiz Basic üyelik ile başlar</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>E-posta <span style={{ color: '#f87171' }}>*</span></label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="kullanici@email.com"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ad Soyad <span style={{ color: '#f87171' }}>*</span></label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ad Soyad"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <Tv style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.25rem' }} />
                  TradingView Kullanıcı Adı <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newUserTradingView}
                  onChange={(e) => setNewUserTradingView(e.target.value)}
                  placeholder="tradingview_username"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowAddUserModal(false)}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleAddUser}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer' }}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showSubscriptionModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
              </div>
              <div>
                <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Abonelik Yükselt</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            {/* User Info Card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedUser.tradingViewId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Tv style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                  <span style={{ color: '#60a5fa', fontSize: '0.8rem' }}>{selectedUser.tradingViewId}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Plan Seç</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {(['premium', 'ultimate', 'lifetime'] as const).map((plan) => {
                    const planConfig = {
                      premium: { label: '🚀 Premium', price: '$49.99', color: '#00F5FF' },
                      ultimate: { label: '👑 Ultimate', price: '$99.99', color: '#A855F7' },
                      lifetime: { label: '⭐ Lifetime', price: '∞', color: '#FFD700' },
                    };
                    const config = planConfig[plan];
                    return (
                      <button
                        key={plan}
                        onClick={() => setSelectedPlan(plan)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          background: selectedPlan === plan ? `${config.color}22` : 'rgba(255,255,255,0.05)',
                          border: selectedPlan === plan ? `1px solid ${config.color}` : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.5rem',
                          color: selectedPlan === plan ? config.color : '#FFFFFF',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {config.label}<br/><span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({config.price})</span>
                      </button>
                    );
                  })}
                </div>
                {selectedPlan === 'ultimate' && (
                  <p style={{ color: '#A855F7', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>✓</span> Ultimate üyelik TradingView erişimi içerir
                  </p>
                )}
                {selectedPlan === 'lifetime' && (
                  <p style={{ color: '#FFD700', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>✓</span> Lifetime üyelik süresiz erişim + TradingView içerir
                  </p>
                )}
              </div>
              
              {/* Hide days input for Lifetime plan */}
              {selectedPlan !== 'lifetime' && (
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Süre (Gün)</label>
                <input
                  type="text"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(e.target.value)}
                  inputMode="numeric"
                  placeholder="Örn: 30, 0, -1"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Test için 0 ve negatif değer girebilirsiniz.</p>
              </div>
              )}
              
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ödeme Tutarı (USD)</label>
                <input
                  type="text"
                  value={subscriptionAmount}
                  onChange={(e) => setSubscriptionAmount(e.target.value)}
                  placeholder="$49.99"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ödeme Yöntemi</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {(['crypto', 'credit_card'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      style={{
                        padding: '0.5rem',
                        background: paymentMethod === pm ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.05)',
                        border: paymentMethod === pm ? '1px solid #00F5FF' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        color: paymentMethod === pm ? '#00F5FF' : '#FFFFFF',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {paymentMethodLabels[pm]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowSubscriptionModal(false); setSelectedUser(null); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleAddSubscription}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer' }}
              >
                Abonelik Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Subscription Modal */}
      {showExtendModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
              </div>
              <div>
                <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Süre Uzat</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>
            
            {/* User Info with TradingView */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
                Mevcut Plan: <span style={{ color: planColors[selectedUser.subscription.plan] }}>{selectedUser.subscription.plan.toUpperCase()}</span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                Kalan Süre: <span style={{ color: '#00F5FF' }}>{selectedUser.subscription.daysRemaining === -1 ? '∞ Süresiz' : `${selectedUser.subscription.daysRemaining} gün`}</span>
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {selectedUser.tradingViewId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Tv style={{ width: '12px', height: '12px', color: '#60a5fa' }} />
                    <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>{selectedUser.tradingViewId}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Eklenecek Gün</label>
                <input
                  type="text"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  inputMode="numeric"
                  placeholder="Örn: 30, 0, -1"
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Test için 0 ve negatif değer girebilirsiniz.</p>
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ödeme Tutarı ({extendPaymentMethod === 'crypto' ? 'USD' : 'EUR'})</label>
                <input
                  type="text"
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(e.target.value)}
                  placeholder={extendPaymentMethod === 'crypto' ? '$29.00' : '€29.00'}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ödeme Yöntemi</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {(['crypto', 'credit_card'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      onClick={() => setExtendPaymentMethod(pm)}
                      style={{
                        padding: '0.5rem',
                        background: extendPaymentMethod === pm ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.05)',
                        border: extendPaymentMethod === pm ? '1px solid #00F5FF' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        color: extendPaymentMethod === pm ? '#00F5FF' : '#FFFFFF',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {paymentMethodLabels[pm]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowExtendModal(false); setSelectedUser(null); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleExtendSubscription}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer' }}
              >
                Süre Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade to Basic Modal */}
      {showDowngradeModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(248,113,113,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDown style={{ width: '24px', height: '24px', color: '#f87171' }} />
              </div>
              <div>
                <h3 style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Basic&apos;e Düşür</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>Ödeme yapılmadı</p>
              </div>
            </div>

            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ color: '#FFFFFF', fontWeight: 500, margin: '0 0 0.5rem 0' }}>{selectedUser.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>{selectedUser.email}</p>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                  Mevcut Plan: <span style={{ color: planColors[selectedUser.subscription.plan] }}>{selectedUser.subscription.plan.toUpperCase()}</span>
                </p>
                {selectedUser.tradingViewId && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    <Tv style={{ width: '12px', height: '12px', display: 'inline', marginRight: '0.25rem' }} />
                    TradingView: <span style={{ color: '#60a5fa' }}>{selectedUser.tradingViewId}</span>
                  </p>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem' }}>
              <p style={{ color: '#fbbf24', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertTriangle style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '0.125rem' }} />
                Bu işlem kullanıcının Ultimate/Lifetime erişimini kaldıracak ve süresiz Basic üyeliğe düşürecektir. TradingView erişimini manuel olarak kapatmanız gerekiyor.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowDowngradeModal(false); setSelectedUser(null); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleDowngradeToBasic}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', border: 'none', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
              >
                Basic&apos;e Düşür
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedUser.profilePicture ? (
                    <img src={selectedUser.profilePicture} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    <span style={{ color: '#000', fontWeight: 700, fontSize: '1.25rem' }}>{selectedUser.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{selectedUser.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
            </div>

            {/* TradingView Info - Editable by Admin */}
            <div style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#00F5FF', fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}>Platform Bilgileri</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Tv style={{ width: '18px', height: '18px', color: '#60a5fa', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '0 0 0.25rem 0' }}>TradingView Username</p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editTradingViewId}
                      onChange={(e) => setEditTradingViewId(e.target.value)}
                      placeholder="TradingView kullanıcı adı"
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem',
                        color: '#FFFFFF',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleSaveTradingViewId}
                      disabled={savingTradingViewId || editTradingViewId === (selectedUser.tradingViewId || '')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: (savingTradingViewId || editTradingViewId === (selectedUser.tradingViewId || '')) 
                          ? 'rgba(255,255,255,0.1)' 
                          : 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: (savingTradingViewId || editTradingViewId === (selectedUser.tradingViewId || '')) 
                          ? 'rgba(255,255,255,0.3)' 
                          : '#000',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: (savingTradingViewId || editTradingViewId === (selectedUser.tradingViewId || '')) 
                          ? 'not-allowed' 
                          : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {savingTradingViewId ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                  {editTradingViewId === 'NO_INDICATORS' && (
                    <p style={{ color: '#f59e0b', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>
                      ⚠️ Kullanıcı TradingView göstergesi istemedi
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem 0' }}>Plan</p>
                <p style={{ color: planColors[selectedUser.subscription.plan], fontSize: '1.125rem', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>
                  {selectedUser.subscription.plan}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem 0' }}>Kalan Süre</p>
                <p style={{ color: selectedUser.subscription.daysRemaining === -1 ? '#4ade80' : '#00F5FF', fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                  {selectedUser.subscription.daysRemaining === -1 ? '∞ Süresiz' : `${selectedUser.subscription.daysRemaining} gün`}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem 0' }}>Başlangıç</p>
                <p style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 500, margin: 0 }}>{selectedUser.subscription.startDate}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: '0 0 0.25rem 0' }}>Bitiş</p>
                <p style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 500, margin: 0 }}>{selectedUser.subscription.endDate || '∞ Süresiz'}</p>
              </div>
            </div>

            {/* Admin Note */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Admin Notu</h4>
                <button
                  onClick={handleSaveAdminNote}
                  disabled={savingAdminNote || editAdminNote.trim() === (selectedUser.adminNote || '').trim()}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: (savingAdminNote || editAdminNote.trim() === (selectedUser.adminNote || '').trim())
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    color: (savingAdminNote || editAdminNote.trim() === (selectedUser.adminNote || '').trim())
                      ? 'rgba(255,255,255,0.3)'
                      : '#000',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: (savingAdminNote || editAdminNote.trim() === (selectedUser.adminNote || '').trim())
                      ? 'not-allowed'
                      : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {savingAdminNote ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
              <textarea
                value={editAdminNote}
                onChange={(e) => setEditAdminNote(e.target.value)}
                placeholder="Sadece adminin görebileceği not..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.5rem 0 0 0' }}>
                Not sadece admin panelinde görünür.
              </p>
            </div>

            {/* Billing History */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Fatura Geçmişi</h4>
              {selectedUser.billingHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedUser.billingHistory.map((bill) => (
                    <div key={bill.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{bill.plan}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                          {bill.date} • {bill.addedBy}
                          {bill.paymentMethod && ` • ${paymentMethodLabels[bill.paymentMethod]}`}
                        </p>
                      </div>
                      <span style={{ color: bill.status === 'paid' ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>{bill.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Henüz fatura yok</p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowUserDetailModal(false); setShowSubscriptionModal(true); }}
                style={{ flex: 1, minWidth: '140px', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CreditCard style={{ width: '16px', height: '16px' }} />
                Plan Değiştir
              </button>
              {selectedUser.subscription.plan !== 'basic' && (
                <button
                  onClick={() => { setShowUserDetailModal(false); setShowExtendModal(true); }}
                  style={{ flex: 1, minWidth: '140px', padding: '0.75rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Süre Uzat
                </button>
              )}
              {selectedUser.subscription.plan !== 'basic' && (
                <button
                  onClick={() => { setShowUserDetailModal(false); setShowDowngradeModal(true); }}
                  style={{ flex: 1, minWidth: '140px', padding: '0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.5rem', color: '#f87171', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <ArrowDown style={{ width: '16px', height: '16px' }} />
                  Basic&apos;e Düşür
                </button>
              )}
              <button
                onClick={() => setShowBanModal(true)}
                style={{ flex: 1, minWidth: '140px', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Ban style={{ width: '16px', height: '16px' }} />
                Kullanıcıyı Banla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban style={{ width: '24px', height: '24px', color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Kullanıcıyı Banla</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0 }}>
                ⚠️ Bu kullanıcı banlandığında giriş yapamayacak ve tüm oturumları sonlandırılacak.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ban Sebebi</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Kullanım koşullarını ihlal, spam, dolandırıcılık..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowBanModal(false); setBanReason(''); }}
                disabled={banningUser}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={handleBanUser}
                disabled={banningUser}
                style={{ flex: 1, padding: '0.75rem', background: banningUser ? 'rgba(239,68,68,0.3)' : '#ef4444', border: 'none', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 600, cursor: banningUser ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {banningUser ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : <Ban style={{ width: '16px', height: '16px' }} />}
                {banningUser ? 'Banlanıyor...' : 'Banla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          width: isMobile ? '80vw' : '280px',
          maxWidth: '280px',
          background: '#050508',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
            padding: '0 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div>
              <Image src="/logo.svg" alt="FibAlgo Logo" width={120} height={32} />
              <span style={{ display: 'block', fontSize: '0.625rem', color: '#BF00FF', fontWeight: 600, letterSpacing: '0.1em' }}>ADMIN</span>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: sidebarOpen && isMobile ? 'block' : 'none' }}
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navigation.map((item) => {
            // Calculate total unread for tickets tab - exclude closed/resolved tickets
            const totalUnread = item.id === 'tickets' 
              ? tickets
                  .filter(t => t.status !== 'closed' && t.status !== 'resolved')
                  .reduce((sum, t) => sum + ((t as any).unreadForAdmin || 0), 0)
              : 0;
            
            // Handle Home link separately
            if (item.isLink && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  <item.icon style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                </Link>
              );
            }
            
            return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                border: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === item.id ? 'rgba(191,0,255,0.2)' : 'transparent',
                color: activeTab === item.id ? '#BF00FF' : 'rgba(255,255,255,0.5)',
              }}
            >
              <item.icon style={{ width: '20px', height: '20px' }} />
              <span style={{ fontWeight: 500, flex: 1 }}>{item.name}</span>
              {/* Unread badge for support */}
              {totalUnread > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000',
                }}>
                  {totalUnread}
                </span>
              )}
            </button>
          )})}
        </nav>

        {/* Admin Profile */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #BF00FF 0%, #00F5FF 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Crown style={{ width: '20px', height: '20px', color: '#0A0A0F' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Admin</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>admin@fibalgo.com</p>
            </div>
            <button 
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
            >
              <LogOut style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ minHeight: '100vh', marginLeft: isMobile ? 0 : '280px' }}>
        {/* Top Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: '64px',
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: isMobile ? '0 1rem' : '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={() => setSidebarOpen(true)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: isMobile ? 'block' : 'none' }}
              >
                <Menu style={{ width: '24px', height: '24px' }} />
              </button>
              <div>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                  {navigation.find(n => n.id === activeTab)?.name || 'Admin Dashboard'}
                </h1>
                <p style={{ fontSize: '0.75rem', color: '#BF00FF', margin: 0 }}>Yönetici Paneli</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: isMobile ? '1rem' : '1.5rem', maxWidth: isMobile ? '100%' : '1200px', margin: '0 auto' }}>
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Grid - 3 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Toplam Kullanıcı</span>
                    <Users style={{ width: '20px', height: '20px', color: '#00F5FF' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFFFFF' }}>{totalUsers}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Aktif Abonelik</span>
                    <CreditCard style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80' }}>{activeSubscriptions}</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Bu Ay Kayıt</span>
                    <UserPlus style={{ width: '20px', height: '20px', color: '#BF00FF' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#BF00FF' }}>{newUsersThisMonth}</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>Bugün: {newUsersToday} yeni üye</p>
                </div>
              </div>

              {/* Today's Registrations Chart */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Son 7 Gün Kayıtlar</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>Günlük yeni kullanıcı sayıları</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(191,0,255,0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                    <UserPlus style={{ width: '16px', height: '16px', color: '#BF00FF' }} />
                    <span style={{ color: '#BF00FF', fontWeight: 600 }}>Bugün: {newUsersToday}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem', height: '120px' }}>
                  {last7DaysData.map((day, index) => (
                    <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <span style={{ color: '#BF00FF', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>{day.count}</span>
                      <div style={{
                        width: '100%',
                        maxWidth: '40px',
                        height: `${Math.max((day.count / maxCount) * 80, 4)}px`,
                        background: index === 6 
                          ? 'linear-gradient(180deg, #BF00FF 0%, #8B00B3 100%)' 
                          : 'linear-gradient(180deg, rgba(191,0,255,0.5) 0%, rgba(139,0,179,0.3) 100%)',
                        borderRadius: '0.25rem 0.25rem 0 0',
                        transition: 'height 0.3s ease',
                      }} />
                      <span style={{ 
                        color: index === 6 ? '#BF00FF' : 'rgba(255,255,255,0.5)', 
                        fontSize: '0.7rem', 
                        marginTop: '0.5rem',
                        fontWeight: index === 6 ? 600 : 400,
                      }}>{day.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Toplam Gelir (TRY)</span>
                    {ratesLoading ? (
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>Kur yükleniyor...</span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }}></span>
                        Canlı Kur
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24' }}>₺{totalRevenueTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>$1 = ₺{usdToTry.toFixed(2)}</span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>€1 = ₺{eurToTry.toFixed(2)}</span>
                    {ratesLastUpdate && <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>({ratesLastUpdate})</span>}
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(0,245,255,0.05) 100%)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Bu Ay Tahmini</span>
                    <Calendar style={{ width: '20px', height: '20px', color: '#00F5FF' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#00F5FF' }}>₺{thisMonthExpectedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>Bu ay yenilenecek abonelikler</p>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.1) 0%, rgba(74,222,128,0.05) 100%)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Bugün Tahmini</span>
                    <Clock style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80' }}>₺{todayExpectedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.25rem 0 0 0' }}>{expiringToday.length} abonelik bugün doluyor</p>
                </div>
              </div>

              {/* Alerts Section */}
              {(expiredSubscriptions.length > 0 || expiringToday.length > 0) && (
                <div style={{ marginBottom: '2rem' }}>
                  {expiredSubscriptions.length > 0 && (
                    <div 
                      onClick={() => setActiveTab('expired')}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(248,113,113,0.1) 0%, rgba(248,113,113,0.05) 100%)', 
                        border: '1px solid rgba(248,113,113,0.3)', 
                        borderRadius: '0.75rem', 
                        padding: '1rem', 
                        marginBottom: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle style={{ width: '24px', height: '24px', color: '#f87171' }} />
                        <div>
                          <p style={{ color: '#f87171', fontWeight: 600, margin: 0 }}>{expiredSubscriptions.length} Süresi Dolmuş Abonelik</p>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Erişimleri kaldırmanız veya uzatmanız gerekiyor</p>
                        </div>
                      </div>
                      <ChevronRight style={{ width: '20px', height: '20px', color: '#f87171' }} />
                    </div>
                  )}
                  
                  {expiringToday.length > 0 && (
                    <div style={{ 
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)', 
                      border: '1px solid rgba(251,191,36,0.3)', 
                      borderRadius: '0.75rem', 
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                      <Clock style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
                      <div>
                        <p style={{ color: '#fbbf24', fontWeight: 600, margin: 0 }}>{expiringToday.length} Abonelik Bugün Doluyor</p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>
                          {expiringToday.map(u => u.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {pendingBillingRequestCount > 0 && (
                    <div 
                      onClick={() => setActiveTab('cancellations')}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.05) 100%)', 
                        border: '1px solid rgba(249,115,22,0.3)', 
                        borderRadius: '0.75rem', 
                        padding: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <XCircle style={{ width: '24px', height: '24px', color: '#f97316' }} />
                        <div>
                          <p style={{ color: '#f97316', fontWeight: 600, margin: 0 }}>{pendingBillingRequestCount} İade/İptal Talebi Bekliyor</p>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>
                            {pendingBillingBreakdown || 'Onay veya red bekleniyor'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight style={{ width: '20px', height: '20px', color: '#f97316' }} />
                    </div>
                  )}

                  {ticketStats.unreadForAdmin > 0 && (
                    <div 
                      onClick={() => setActiveTab('tickets')}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)', 
                        border: '1px solid rgba(251,191,36,0.3)', 
                        borderRadius: '0.75rem', 
                        padding: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MessageCircle style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
                        <div>
                          <p style={{ color: '#fbbf24', fontWeight: 600, margin: 0 }}>{ticketStats.unreadForAdmin} Okunmamış Mesaj</p>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>Destek taleplerinde yanıt bekliyor</p>
                        </div>
                      </div>
                      <ChevronRight style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <UserPlus style={{ width: '18px', height: '18px' }} />
                  Kullanıcı Ekle
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Users style={{ width: '18px', height: '18px' }} />
                  Kullanıcıları Yönet
                </button>
              </div>

              {/* Expired Subscriptions Section - Dashboard */}
              {expiredSubscriptions.length > 0 && (
                <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '2rem' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle style={{ width: '20px', height: '20px', color: '#f87171' }} />
                      <h3 style={{ color: '#f87171', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Süresi Dolmuş Kullanıcılar ({expiredSubscriptions.length})</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('expired')}
                      style={{ background: 'rgba(248,113,113,0.2)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Tümünü Gör <ChevronRight style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                  <div>
                    {expiredSubscriptions.slice(0, 5).map((user, index) => (
                      <div 
                        key={user.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '0.875rem 1.25rem',
                          borderBottom: index < Math.min(4, expiredSubscriptions.length - 1) ? '1px solid rgba(248,113,113,0.1)' : 'none',
                          background: 'rgba(248,113,113,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{user.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
                            <p style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>{Math.abs(user.subscription.daysRemaining)} gün geçti</p>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', margin: 0 }}>{user.subscription.endDate}</p>
                          </div>
                          <button
                            onClick={() => { setSelectedUser(user); setShowExtendModal(true); }}
                            style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Uzat
                          </button>
                          <button
                            onClick={() => { setSelectedUser(user); setShowDowngradeModal(true); }}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            Düşür
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Users */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Son Kullanıcılar</h3>
                </div>
                <div>
                  {users.slice(0, 5).map((user, index) => (
                    <div 
                      key={user.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem',
                        borderBottom: index < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ color: '#000', fontWeight: 600 }}>{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>{user.email}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', background: `${planColors[user.subscription.plan]}20`, color: planColors[user.subscription.plan], textTransform: 'capitalize' }}>
                          {user.subscription.plan}
                        </span>
                        <button
                          onClick={() => { setSelectedUser(user); setShowUserDetailModal(true); }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                        >
                          <Eye style={{ width: '18px', height: '18px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              {/* Search & Filter */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kullanıcı ara (email veya isim)..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 3rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0b1220', color: '#ffffff' }}>Tüm Planlar</option>
                  <option value="basic" style={{ background: '#0b1220', color: '#ffffff' }}>Basic</option>
                  <option value="hub" style={{ background: '#0b1220', color: '#ffffff' }}>Hub</option>
                  <option value="pro" style={{ background: '#0b1220', color: '#ffffff' }}>Pro</option>
                </select>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <UserPlus style={{ width: '18px', height: '18px' }} />
                  Ekle
                </button>
              </div>

              {/* Users List */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <div 
                      key={user.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem',
                        borderBottom: index < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                        <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ color: '#000', fontWeight: 600 }}>{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <p style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                            {/* Account Type Badge */}
                            {user.accountType === 'google' ? (
                              <span style={{ 
                                fontSize: '0.6rem', 
                                padding: '0.15rem 0.4rem', 
                                borderRadius: '9999px', 
                                background: 'rgba(234,67,53,0.15)', 
                                color: '#ea4335', 
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                <svg style={{ width: '8px', height: '8px' }} viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Google
                              </span>
                            ) : (
                              <>
                                <span style={{ 
                                  fontSize: '0.6rem', 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '9999px', 
                                  background: 'rgba(156,163,175,0.15)', 
                                  color: '#9ca3af', 
                                  fontWeight: 600 
                                }}>
                                  Email
                                </span>
                                {user.emailVerified && (
                                  <span style={{ 
                                    fontSize: '0.6rem', 
                                    padding: '0.15rem 0.4rem', 
                                    borderRadius: '9999px', 
                                    background: 'rgba(34,197,94,0.15)', 
                                    color: '#22c55e', 
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}>
                                    ✓ Verified
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {user.tradingViewId && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Tv style={{ width: '10px', height: '10px', color: '#60a5fa' }} />
                                <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}>{user.tradingViewId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', background: `${planColors[user.subscription.plan]}20`, color: planColors[user.subscription.plan], textTransform: 'uppercase', fontWeight: 600 }}>
                            {user.subscription.plan}
                          </span>
                        </div>
                        
                        <div style={{ textAlign: 'center', minWidth: '70px' }}>
                          <p style={{ color: user.subscription.daysRemaining === -1 ? '#4ade80' : user.subscription.isActive ? '#4ade80' : '#f87171', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                            {user.subscription.daysRemaining === -1 ? '∞' : `${user.subscription.daysRemaining} gün`}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => { setSelectedUser(user); setShowSubscriptionModal(true); }}
                            title="Plan Değiştir"
                            style={{ background: 'rgba(0,245,255,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', color: '#00F5FF', cursor: 'pointer' }}
                          >
                            <CreditCard style={{ width: '16px', height: '16px' }} />
                          </button>
                          {user.subscription.plan !== 'basic' && (
                            <button
                              onClick={() => { setSelectedUser(user); setShowExtendModal(true); }}
                              title="Süre Uzat"
                              style={{ background: 'rgba(74,222,128,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', color: '#4ade80', cursor: 'pointer' }}
                            >
                              <Plus style={{ width: '16px', height: '16px' }} />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedUser(user); setShowUserDetailModal(true); }}
                            title="Detayları Gör"
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', color: '#FFFFFF', cursor: 'pointer' }}
                          >
                            <Eye style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <Users style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Kullanıcı bulunamadı</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Abonelik Yönetimi</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Kullanıcı aboneliklerini buradan yönetebilirsiniz.</p>
              </div>

              {/* Active Subscriptions */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Aktif Abonelikler</h3>
                  <span style={{ color: '#4ade80', fontSize: '0.875rem' }}>{activeSubscriptions} aktif</span>
                </div>
                <div>
                  {users.filter(u => u.subscription.isActive && u.subscription.plan !== 'basic').map((user, index) => (
                    <div 
                      key={user.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem',
                        borderBottom: index < users.filter(u => u.subscription.isActive && u.subscription.plan !== 'basic').length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', background: `${planColors[user.subscription.plan]}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Crown style={{ width: '20px', height: '20px', color: planColors[user.subscription.plan] }} />
                        </div>
                        <div>
                          <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>{user.subscription.plan.toUpperCase()} • {user.subscription.daysRemaining === -1 ? 'Ömür boyu' : `${user.subscription.daysRemaining} gün kaldı`}</p>
                        </div>
                      </div>
                      {user.subscription.plan !== 'basic' && (
                        <button
                          onClick={() => { setSelectedUser(user); setShowExtendModal(true); }}
                          style={{ padding: '0.5rem 1rem', background: 'rgba(0,245,255,0.1)', border: 'none', borderRadius: '0.5rem', color: '#00F5FF', fontWeight: 500, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Süre Uzat
                        </button>
                      )}
                    </div>
                  ))}
                  {users.filter(u => u.subscription.isActive && u.subscription.plan !== 'basic').length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Aktif premium abonelik yok</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Expired Subscriptions Tab */}
          {activeTab === 'expired' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Süresi Dolmuş Abonelikler</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  Abonelik süresi dolmuş kullanıcıları buradan yönetebilirsiniz. 
                  <span style={{ color: '#f87171' }}> {expiredSubscriptions.length} kullanıcı</span> erişim kaldırılmayı bekliyor.
                </p>
              </div>

              {expiredSubscriptions.length > 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  {expiredSubscriptions.map((user, index) => (
                    <div 
                      key={user.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem',
                        borderBottom: index < expiredSubscriptions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        background: 'rgba(248,113,113,0.03)',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                        <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ color: '#fff', fontWeight: 600 }}>{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>{user.email}</p>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {user.tradingViewId && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Tv style={{ width: '10px', height: '10px', color: '#60a5fa' }} />
                                <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}>{user.tradingViewId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', background: 'rgba(248,113,113,0.2)', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>
                            {user.subscription.plan} - EXPIRED
                          </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <p style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                            {Math.abs(user.subscription.daysRemaining)} gün geçti
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: 0 }}>
                            Bitiş: {user.subscription.endDate}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => { setSelectedUser(user); setShowExtendModal(true); }}
                            title="Süre Uzat"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.375rem',
                              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', 
                              border: 'none', 
                              borderRadius: '0.5rem', 
                              padding: '0.5rem 0.75rem', 
                              color: '#000', 
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            <Plus style={{ width: '14px', height: '14px' }} />
                            Uzat
                          </button>
                          <button
                            onClick={() => { setSelectedUser(user); setShowDowngradeModal(true); }}
                            title="Basic'e Düşür"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.375rem',
                              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', 
                              border: 'none', 
                              borderRadius: '0.5rem', 
                              padding: '0.5rem 0.75rem', 
                              color: '#fff', 
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            <ArrowDown style={{ width: '14px', height: '14px' }} />
                            Düşür
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(74,222,128,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Check style={{ width: '32px', height: '32px', color: '#4ade80' }} />
                  </div>
                  <h3 style={{ color: '#4ade80', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Tebrikler!</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Süresi dolmuş abonelik bulunmuyor.</p>
                </div>
              )}

              {/* Expiring Soon Section */}
              {expiringToday.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fbbf24', marginBottom: '1rem' }}>
                    ⚠️ Bugün Dolacak Abonelikler ({expiringToday.length})
                  </h3>
                  <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '1rem', overflow: 'hidden' }}>
                    {expiringToday.map((user, index) => (
                      <div 
                        key={user.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '1rem 1.25rem',
                          borderBottom: index < expiringToday.length - 1 ? '1px solid rgba(251,191,36,0.2)' : 'none',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              <span style={{ color: '#000', fontWeight: 600 }}>{user.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 500, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => { setSelectedUser(user); setShowExtendModal(true); }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.375rem',
                              background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', 
                              border: 'none', 
                              borderRadius: '0.5rem', 
                              padding: '0.5rem 0.75rem', 
                              color: '#000', 
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            <Plus style={{ width: '14px', height: '14px' }} />
                            Şimdi Uzat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cancellation Requests Tab */}
          {activeTab === 'cancellations' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>İptal Talepleri</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  Abonelik iptali talep eden kullanıcıları buradan yönetebilirsiniz.
                  {pendingBillingRequestCount > 0 && (
                    <span style={{ color: '#f97316' }}> {pendingBillingRequestCount} bekleyen talep</span>
                  )}
                  {pendingBillingBreakdown && (
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}> ({pendingBillingBreakdown})</span>
                  )}
                </p>
              </div>

              {pendingRefunds.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}>
                    İade Talepleri ({pendingRefunds.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingRefunds.map((req: any) => (
                      <div
                        key={req.id}
                        style={{
                          background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.03) 100%)',
                          border: '1px solid rgba(251,191,36,0.35)',
                          borderRadius: '1rem',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#000', fontWeight: 700, fontSize: '1.1rem' }}>{req.users?.full_name?.charAt(0) || 'U'}</span>
                            </div>
                            <div>
                              <p style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{req.users?.full_name || 'User'}</p>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>{req.users?.email || ''}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', fontWeight: 600 }}>
                              İade Talebi
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontWeight: 600 }}>
                              Bekliyor
                            </span>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '0.75rem', padding: '1rem' }}>
                          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0 }}>
                            {req.reason}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleApproveRefund(req.user_id)}
                            style={{
                              padding: '0.6rem 1rem',
                              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                              border: 'none',
                              borderRadius: '0.6rem',
                              color: '#000',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleRejectRefund(req.user_id)}
                            style={{
                              padding: '0.6rem 1rem',
                              background: 'rgba(239,68,68,0.15)',
                              border: '1px solid rgba(239,68,68,0.4)',
                              borderRadius: '0.6rem',
                              color: '#f87171',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingCancellations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingCancellations.map((user) => (
                    <div 
                      key={user.id}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.02) 100%)',
                        border: '1px solid rgba(249,115,22,0.3)',
                        borderRadius: '1rem',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>{user.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center' }}>{user.name}<AccountTypeBadges user={user} /></p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: `${planColors[user.subscription.plan]}20`, color: planColors[user.subscription.plan], textTransform: 'uppercase', fontWeight: 600 }}>
                            {user.subscription.plan}
                          </span>
                          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(249,115,22,0.2)', color: '#f97316', fontWeight: 600 }}>
                            Bekliyor
                          </span>
                        </div>
                      </div>

                      {/* Cancellation Details */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '0.75rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <XCircle style={{ width: '16px', height: '16px', color: '#f97316' }} />
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 500 }}>İptal Talebi</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>
                          Talep Tarihi: {user.cancellationRequest?.requestDate}
                        </p>
                        <p style={{ color: '#FFFFFF', fontSize: '0.9rem', margin: 0, fontStyle: 'italic' }}>
                          "{user.cancellationRequest?.reason || 'Sebep belirtilmedi'}"
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleApproveCancellation(user.id)}
                          style={{
                            flex: 1,
                            minWidth: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Check style={{ width: '18px', height: '18px' }} />
                          Onayla (Basic'e Düşür)
                        </button>
                        <button
                          onClick={() => handleRejectCancellation(user.id)}
                          style={{
                            flex: 1,
                            minWidth: '120px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.5rem',
                            color: '#fff',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          <X style={{ width: '18px', height: '18px' }} />
                          Reddet
                        </button>
                        <button
                          onClick={() => { setSelectedUser(user); setShowUserDetailModal(true); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye style={{ width: '18px', height: '18px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingRefunds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Check style={{ width: '48px', height: '48px', color: '#4ade80', margin: '0 auto 1rem' }} />
                  <p style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Bekleyen İptal Talebi Yok</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Tüm iptal talepleri işlenmiş durumda.</p>
                </div>
              ) : null}
            </>
          )}

          {/* Support Tickets Tab */}
          {activeTab === 'tickets' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Destek Talepleri</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    Kullanıcı destek taleplerini buradan yönetin.
                    <span style={{ color: '#fbbf24' }}> {ticketStats.open} açık</span>,
                    <span style={{ color: '#00F5FF' }}> {ticketStats.inProgress} işleniyor</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setTicketFilter(status)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: ticketFilter === status ? 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)' : 'rgba(255,255,255,0.1)',
                        color: ticketFilter === status ? '#000' : '#fff',
                        fontWeight: ticketFilter === status ? 600 : 400,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {status === 'all' ? 'Tümü' : 
                       status === 'open' ? 'Açık' : 
                       status === 'in-progress' ? 'İşleniyor' : 
                       status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                      {status !== 'all' && ` (${tickets.filter(t => t.status === status).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Ticket ara... (konu, kullanıcı adı, email veya ID)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Ticket Detail View */}
              {selectedTicket ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  {/* Ticket Header */}
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      onClick={() => { selectedTicketIdRef.current = null; setSelectedTicket(null); }}
                      style={{ background: 'none', border: 'none', color: '#00F5FF', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      ← Listeye Dön
                    </button>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>{selectedTicket.subject}</h3>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                          #{selectedTicket.id} • {selectedTicket.userName} ({selectedTicket.userEmail})
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleTicketStatusChange(selectedTicket.id, e.target.value as SupportTicket['status'])}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="open" style={{ background: '#0b1220', color: '#ffffff' }}>Açık</option>
                          <option value="in-progress" style={{ background: '#0b1220', color: '#ffffff' }}>İşleniyor</option>
                          <option value="resolved" style={{ background: '#0b1220', color: '#ffffff' }}>Çözüldü</option>
                          <option value="closed" style={{ background: '#0b1220', color: '#ffffff' }}>Kapatıldı</option>
                        </select>
                        <span style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: selectedTicket.category === 'billing' ? 'rgba(251,191,36,0.2)' :
                                      selectedTicket.category === 'technical' ? 'rgba(239,68,68,0.2)' :
                                      selectedTicket.category === 'cancellation' ? 'rgba(248,113,113,0.2)' : 'rgba(156,163,175,0.2)',
                          color: selectedTicket.category === 'billing' ? '#fbbf24' :
                                 selectedTicket.category === 'technical' ? '#f87171' :
                                 selectedTicket.category === 'cancellation' ? '#f97316' : '#9ca3af',
                        }}>
                          {selectedTicket.category === 'general' ? 'Genel' :
                           selectedTicket.category === 'billing' ? 'Ödeme' :
                           selectedTicket.category === 'technical' ? 'Teknik' :
                           selectedTicket.category === 'cancellation' ? 'İptal' : 'Diğer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ maxHeight: '450px', overflowY: 'auto', padding: '1rem' }}>
                    {selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{
                          maxWidth: '75%',
                          padding: '1rem',
                          borderRadius: msg.senderRole === 'admin' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                          background: msg.senderRole === 'admin' 
                            ? 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(0,168,255,0.2) 100%)'
                            : 'rgba(255,255,255,0.05)',
                          border: msg.senderRole === 'admin'
                            ? '1px solid rgba(0,245,255,0.3)'
                            : '1px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: msg.senderRole === 'admin' ? '#00F5FF' : '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                              {msg.senderRole === 'admin' ? 'FibAlgo - Support' : `${msg.senderName}`}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                              {formatTicketDateTime(msg.timestamp)}
                            </span>
                          </div>
                          <p style={{ color: '#FFFFFF', fontSize: '0.9rem', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                          {(msg as any).attachmentUrl && (
                            <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
                              <a href={(msg as any).attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={(msg as any).attachmentUrl} 
                                  alt="Attachment" 
                                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', cursor: 'pointer', borderRadius: '0.5rem' }} 
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Scroll anchor for auto-scroll */}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Input */}
                  {(selectedTicket.status === 'open' || selectedTicket.status === 'in-progress') && (
                    <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {ticketAttachmentUrl && (
                        <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'rgba(0,245,255,0.1)', borderRadius: '0.5rem' }}>
                          <img src={ticketAttachmentUrl} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                          <span style={{ flex: 1, color: '#00F5FF', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticketAttachment?.name}</span>
                          <button
                            onClick={() => { setTicketAttachment(null); setTicketAttachmentUrl(null); }}
                            style={{ padding: '0.25rem', background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '0.25rem', color: '#f87171', cursor: 'pointer' }}
                          >
                            <X style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label style={{
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          color: 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Camera style={{ width: '18px', height: '18px' }} />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 10 * 1024 * 1024) {
                                  alert('Dosya boyutu 10MB\'dan küçük olmalı');
                                  return;
                                }
                                setTicketAttachment(file);
                                setTicketAttachmentUrl(URL.createObjectURL(file));
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <input
                          type="text"
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !ticketReplySending && handleTicketReply()}
                          placeholder="Yanıt yazın..."
                          style={{
                            flex: 1,
                            padding: '0.75rem 1rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.75rem',
                            color: '#FFFFFF',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={handleTicketReply}
                          disabled={(!ticketReply.trim() && !ticketAttachment) || ticketAttachmentUploading || ticketReplySending}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: ((ticketReply.trim() || ticketAttachment) && !ticketAttachmentUploading && !ticketReplySending) ? 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '0.75rem',
                            color: ((ticketReply.trim() || ticketAttachment) && !ticketAttachmentUploading && !ticketReplySending) ? '#000' : 'rgba(255,255,255,0.3)',
                            cursor: ((ticketReply.trim() || ticketAttachment) && !ticketAttachmentUploading && !ticketReplySending) ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                          }}
                        >
                          {(ticketAttachmentUploading || ticketReplySending) ? (
                            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Send style={{ width: '18px', height: '18px' }} />
                          )}
                          {ticketReplySending ? 'Gönderiliyor...' : 'Gönder'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Ticket List */
                <>
                  {filteredTickets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {filteredTickets.map((ticket) => {
                        // Don't show unread for closed/resolved tickets
                        const showUnread = (ticket as any).unreadForAdmin > 0 && ticket.status !== 'closed' && ticket.status !== 'resolved';
                        return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          style={{
                            background: showUnread ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                            border: showUnread ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.75rem',
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{ticket.subject}</h4>
                              {/* Unread Badge for Admin - only show for open/in-progress tickets */}
                              {showUnread && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: '20px',
                                  height: '20px',
                                  padding: '0 6px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                  color: '#000',
                                }}>
                                  {(ticket as any).unreadForAdmin}
                                </span>
                              )}
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                background: ticket.status === 'open' ? 'rgba(251,191,36,0.2)' : 
                                            ticket.status === 'in-progress' ? 'rgba(0,245,255,0.2)' :
                                            ticket.status === 'resolved' ? 'rgba(74,222,128,0.2)' : 'rgba(156,163,175,0.2)',
                                color: ticket.status === 'open' ? '#fbbf24' : 
                                       ticket.status === 'in-progress' ? '#00F5FF' :
                                       ticket.status === 'resolved' ? '#4ade80' : '#9ca3af',
                              }}>
                                {ticket.status === 'open' ? 'Açık' :
                                 ticket.status === 'in-progress' ? 'İşleniyor' :
                                 ticket.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                              </span>
                            </div>
                            <ChevronRight style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.3)' }} />
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                            {ticket.userName} ({ticket.userEmail}) • {ticket.messages.length} mesaj • {formatTicketDate(ticket.updatedAt)}
                          </p>
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <MessageCircle style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem' }} />
                      <p style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                        {ticketFilter === 'all' ? 'Henüz Destek Talebi Yok' : 'Bu kategoride talep bulunamadı'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                        {ticketFilter === 'all' ? 'Kullanıcılar destek talebi oluşturduğunda burada görünecek.' : 'Farklı bir filtre deneyin.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Yönetici Ayarları</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Panel ayarlarını buradan yönetebilirsiniz.</p>
              </div>

              {/* API Settings */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔌 API Ayarları
                </h3>
                
                {settingsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 style={{ width: '24px', height: '24px', color: '#00F5FF', animation: 'spin 1s linear infinite' }} />
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>Yükleniyor...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* News API Toggle */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>Haber API'leri</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '9999px',
                            background: appSettings.news_api_enabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                            color: appSettings.news_api_enabled ? '#22c55e' : '#ef4444'
                          }}>
                            {appSettings.news_api_enabled ? 'AKTİF' : 'KAPALI'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                          Açık olduğunda haber API'leri çalışır ve sitede haberler çekilir. Kapalıysa haber çekimi tamamen durur.
                        </p>
                      </div>
                      
                      <button
                        onClick={async () => {
                          try {
                            setSettingsSaving(true);
                            const newValue = !appSettings.news_api_enabled;
                            const response = await fetch('/api/admin/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ news_api_enabled: newValue })
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setAppSettings({ news_api_enabled: newValue });
                              alert(data.message || 'Ayarlar güncellendi');
                            } else {
                              alert('Ayarlar güncellenemedi');
                            }
                          } catch (error) {
                            console.error('Settings update error:', error);
                            alert('Ayarlar güncellenirken hata oluştu');
                          } finally {
                            setSettingsSaving(false);
                          }
                        }}
                        disabled={settingsSaving}
                        style={{
                          width: '56px',
                          height: '28px',
                          borderRadius: '14px',
                          border: 'none',
                          background: appSettings.news_api_enabled 
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                            : 'rgba(255,255,255,0.1)',
                          cursor: settingsSaving ? 'wait' : 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s ease',
                          opacity: settingsSaving ? 0.6 : 1,
                          flexShrink: 0,
                          marginLeft: '1rem'
                        }}
                      >
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          position: 'absolute',
                          top: '3px',
                          left: appSettings.news_api_enabled ? '31px' : '3px',
                          transition: 'left 0.3s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {settingsSaving && (
                            <Loader2 style={{ width: '12px', height: '12px', color: '#666', animation: 'spin 1s linear infinite' }} />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Info Box */}
                    <div style={{ 
                      padding: '1rem',
                      background: appSettings.news_api_enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      borderRadius: '0.75rem',
                      border: `1px solid ${appSettings.news_api_enabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                    }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: appSettings.news_api_enabled ? '#22c55e' : '#ef4444' }}>
                        {appSettings.news_api_enabled 
                          ? '✅ Haber API\'leri şu anda aktif. Haberler düzenli olarak çekiliyor ve analiz ediliyor.'
                          : '⚠️ Haber API\'leri kapalı. Siteye yeni haber çekilmiyor. Mevcut haberler görüntülenebilir.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TradingView Tab - Ultimate'dan düşürülen kullanıcılar */}
          {activeTab === 'tradingview' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  <Tv style={{ width: '24px', height: '24px', display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  TradingView Erişim Yönetimi
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  Ultimate paketten düşürülen kullanıcıların TradingView erişimlerini kaldırın.
                </p>
              </div>

              {tradingViewDowngrades.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
                  <Tv style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.3)', margin: '0 auto 1rem' }} />
                  <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 600 }}>🎉 Harika!</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>Kaldırılması gereken TradingView erişimi yok.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(239,68,68,0.1)' }}>
                    <p style={{ color: '#ef4444', margin: 0, fontWeight: 600 }}>
                      ⚠️ {tradingViewDowngrades.length} kullanıcının TradingView erişimi kaldırılmalı
                    </p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Kullanıcı</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>TradingView ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Önceki Plan</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Düşürülme Sebebi</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Tarih</th>
                          <th style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradingViewDowngrades.map((downgrade) => (
                          <tr key={downgrade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem' }}>
                              <div>
                                <p style={{ color: '#FFFFFF', fontWeight: 500, margin: 0 }}>{downgrade.full_name || 'İsimsiz'}</p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>{downgrade.email}</p>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                background: downgrade.tradingview_id ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.1)', 
                                color: downgrade.tradingview_id ? '#00F5FF' : 'rgba(255,255,255,0.4)', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '9999px', 
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                              }}>
                                {downgrade.tradingview_id || 'Belirtilmemiş'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                background: 'rgba(168,85,247,0.2)', 
                                color: '#A855F7', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '9999px', 
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {downgrade.previous_plan?.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                color: downgrade.downgrade_reason === 'refunded' ? '#ef4444' : '#f59e0b',
                                fontSize: '0.85rem'
                              }}>
                                {downgrade.downgrade_reason === 'subscription_canceled' && '📅 Abonelik İptali'}
                                {downgrade.downgrade_reason === 'subscription_revoked' && '⚠️ Ödeme Başarısız'}
                                {downgrade.downgrade_reason === 'payment_failed' && '💳 Ödeme Hatası'}
                                {downgrade.downgrade_reason === 'refunded' && '💸 İade Edildi'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                              {new Date(downgrade.created_at).toLocaleDateString('tr-TR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleRemoveTradingViewAccess(downgrade.id)}
                                disabled={removingTradingView === downgrade.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  background: removingTradingView === downgrade.id ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  borderRadius: '0.5rem',
                                  color: '#ef4444',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                  cursor: removingTradingView === downgrade.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                                title="TradingView erişimini kaldırdım olarak işaretle"
                              >
                                {removingTradingView === downgrade.id ? (
                                  <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <XCircle style={{ width: '14px', height: '14px' }} />
                                )}
                                Kaldırıldı
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,245,255,0.1)', borderRadius: '0.75rem', border: '1px solid rgba(0,245,255,0.2)' }}>
                <p style={{ color: '#00F5FF', margin: 0, fontSize: '0.9rem' }}>
                  <strong>💡 Bilgi:</strong> Kullanıcının TradingView erişimini manuel olarak kaldırdıktan sonra "Kaldırıldı" butonuna tıklayarak bu listeden silebilirsiniz.
                </p>
              </div>

              {/* Eklenecek Üyeler Section */}
              <div style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>➕</span>
                  Eklenecek Üyeler
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>
                  Polar üzerinden Ultimate alan kullanıcıların TradingView erişimlerini sağlayın.
                </p>
              </div>

              {tradingViewUpgrades.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
                  <Tv style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.3)', margin: '0 auto 1rem' }} />
                  <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 600 }}>✨ Bekleyen yok!</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>Şu an TradingView erişimi bekleyen kullanıcı bulunmuyor.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(34,197,94,0.1)' }}>
                    <p style={{ color: '#22c55e', margin: 0, fontWeight: 600 }}>
                      🎉 {tradingViewUpgrades.length} kullanıcı TradingView erişimi bekliyor
                    </p>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Kullanıcı</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>TradingView ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Yeni Plan</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Tarih</th>
                          <th style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradingViewUpgrades.map((upgrade) => (
                          <tr key={upgrade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem' }}>
                              <div>
                                <p style={{ color: '#FFFFFF', fontWeight: 500, margin: 0 }}>{upgrade.full_name || 'İsimsiz'}</p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>{upgrade.email}</p>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                background: upgrade.tradingview_id ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.1)', 
                                color: upgrade.tradingview_id ? '#00F5FF' : 'rgba(255,255,255,0.4)', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '9999px', 
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                              }}>
                                {upgrade.tradingview_id || 'Belirtilmemiş'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ 
                                background: 'rgba(168,85,247,0.2)', 
                                color: '#A855F7', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '9999px', 
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {upgrade.plan?.toUpperCase() || 'ULTIMATE'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                              {new Date(upgrade.created_at).toLocaleDateString('tr-TR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleGrantTradingViewAccess(upgrade.id, upgrade.tradingview_id)}
                                disabled={grantingTradingView === upgrade.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  background: grantingTradingView === upgrade.id ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)',
                                  border: '1px solid rgba(34,197,94,0.3)',
                                  borderRadius: '0.5rem',
                                  color: '#22c55e',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                  cursor: grantingTradingView === upgrade.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                                title="TradingView erişimini sağladım olarak işaretle"
                              >
                                {grantingTradingView === upgrade.id ? (
                                  <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <CheckCircle style={{ width: '14px', height: '14px' }} />
                                )}
                                Erişim Verildi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '0.75rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p style={{ color: '#22c55e', margin: 0, fontSize: '0.9rem' }}>
                  <strong>💡 Bilgi:</strong> Polar üzerinden Ultimate alan kullanıcılar otomatik olarak bu listeye eklenir. TradingView erişimini sağladıktan sonra "Erişim Verildi" butonuna tıklayın.
                </p>
              </div>
            </>
          )}

          {/* Banned Users Tab */}
          {activeTab === 'banned' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Banlı Kullanıcılar</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Sisteme giriş yapması engellenen kullanıcılar.</p>
              </div>

              {bannedUsers.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
                  <ShieldOff style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.3)', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>Henüz banlanan kullanıcı yok</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Kullanıcı</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Ban Sebebi</th>
                          <th style={{ padding: '1rem', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Ban Tarihi</th>
                          <th style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bannedUsers.map((user) => (
                          <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Ban style={{ width: '18px', height: '18px', color: '#ef4444' }} />
                                </div>
                                <div>
                                  <p style={{ color: '#FFFFFF', fontWeight: 500, margin: 0 }}>{user.full_name || 'İsimsiz'}</p>
                                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0 }}>{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0 }}>{user.ban_reason || 'Belirtilmemiş'}</p>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
                                {user.banned_at ? new Date(user.banned_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </p>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleUnbanUser(user.id)}
                                style={{ padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                              >
                                <ShieldOff style={{ width: '14px', height: '14px' }} />
                                Banı Kaldır
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
