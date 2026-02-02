'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Home,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Plus,
  Receipt,
  Send,
  Settings,
  Shield,
  User,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  createTicket,
  getTicketsByUser,
  addMessageToTicket,
  getTicketById,
  getUser,
  requestCancellation,
  type SupportTicket,
  type AppUser
} from '@/lib/store';

interface DashboardClientProps {
  user: SupabaseUser;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // URL'den tab parametresini oku
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      // Map old tab names to new ones
      const tabMap: Record<string, string> = {
        'profile': 'settings',
        'billing': 'subscription'
      };
      const mappedTab = tabMap[tabParam] || tabParam;
      if (['dashboard', 'subscription', 'support', 'settings'].includes(mappedTab)) {
        setActiveTab(mappedTab);
      }
    }
  }, [searchParams]);

  // Payment success detection - force refresh cache when returning from checkout
  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    if (paymentParam === 'success') {
      console.log('🎉 Payment success detected - forcing cache refresh...');
      setPaymentSuccess(true);
      
      // Clear old cache and force fresh fetch from database
      clearUserCache();
      
      // Delay refresh slightly to allow webhook to process
      const refreshTimer = setTimeout(async () => {
        console.log('📥 Fetching fresh user data after payment...');
        await fetchAndCacheUser(user.id, user.email || '', { refresh: true });
        // Reload the page to get fresh state
        window.location.href = '/dashboard';
      }, 2000);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [searchParams, user.id, user.email]);

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
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoiceForRefund, setSelectedInvoiceForRefund] = useState<{ id: string; plan: string; date: string } | null>(null);
  
  // Check if user signed up with OAuth (Google, Twitter, or TikTok)
  const oauthProviders = ['google', 'twitter', 'tiktok'];
  const userProvider = user.app_metadata?.provider as string | undefined;
  const userProviders: string[] = user.app_metadata?.providers || [];
  const isOAuthUser = (userProvider && oauthProviders.includes(userProvider)) || oauthProviders.some(p => userProviders.includes(p));
  const oauthProviderName = userProvider === 'twitter' ? 'X (Twitter)' : 
                            userProvider === 'tiktok' ? 'TikTok' : 
                            userProvider === 'google' ? 'Google' : 'OAuth';

  // User profile state
  const [profileName, setProfileName] = useState(user.user_metadata?.full_name || 'Admin User');
  const profileNameDirtyRef = useRef(false);
  const [profileEmail, setProfileEmail] = useState(user.email || 'admin@fibalgo.com');
  const [newEmail, setNewEmail] = useState('');
  const [tradingViewId, setTradingViewId] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Field validation error states
  const [emailFieldError, setEmailFieldError] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationType, setVerificationType] = useState<'email' | 'password'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Current user data from store - initialize from global cache to prevent flash
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedUser();
      if (cached) {
        // Convert CachedUserData to AppUser format
        return {
          id: cached.id,
          email: cached.email,
          name: cached.name,
          role: cached.role,
          createdAt: '',
          subscription: {
            plan: cached.subscription.plan as 'basic' | 'premium' | 'ultimate' | 'lifetime',
            startDate: cached.subscription.startDate,
            endDate: cached.subscription.endDate,
            daysRemaining: cached.subscription.daysRemaining,
            isActive: cached.subscription.isActive,
            status: cached.subscription.status as 'active' | 'expired' | 'pending',
          },
          billingHistory: cached.billingHistory.map(b => {
            const paymentMethod = (b.paymentMethod || '').toString().toLowerCase();
            const isCard = paymentMethod === 'credit_card' || paymentMethod === 'card' || paymentMethod === 'polar' || paymentMethod === 'credit card';
            const normalizedStatus = String(b.status) === 'completed' ? 'paid' : b.status;
            return {
              ...b,
              status: normalizedStatus as 'paid' | 'pending' | 'refunded',
              paymentMethod: isCard ? 'credit_card' : 'crypto',
              addedBy: 'System',
            };
          }),
          cancellationRequest: cached.cancellationRequest ? {
            id: cached.cancellationRequest.id,
            requestDate: '',
            reason: '',
            status: cached.cancellationRequest.status as 'pending' | 'approved' | 'rejected',
          } : undefined,
          refundRequest: cached.refundRequest ? {
            id: cached.refundRequest.id,
            requestDate: '',
            reason: '',
            status: cached.refundRequest.status as 'pending' | 'approved' | 'rejected',
          } : undefined,
        } as AppUser;
      }
    }
    return null;
  });
  
  // Admin state - persisted in localStorage for immediate display
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedUser();
      if (cached) return cached.role === 'admin';
      return localStorage.getItem(`isAdmin_${user.id}`) === 'true';
    }
    return false;
  });

  // Support ticket state
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('general');
  const [replyMessage, setReplyMessage] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Ticket attachment state
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [ticketAttachmentUrl, setTicketAttachmentUrl] = useState<string | null>(null);
            {/* New Ticket Modal */}
            {showNewTicketModal && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
                <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
                    </div>
                    <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>New Support Ticket</h3>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Please fill out the form below to submit a new support ticket.
                  </p>
                  {/* Additional form fields for new ticket would go here */}
                </div>
              </div>
            )}
  const [ticketAttachmentUploading, setTicketAttachmentUploading] = useState(false);
  const [replySending, setReplySending] = useState(false);

  // Messages scroll ref - auto scroll to bottom only when a NEW message is added
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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

  // Load user data and tickets
  const loadUserData = async () => {
    try {
      // Use global cache service for consistent data across all pages
      const cachedData = await fetchAndCacheUser(user.id, user.email || '', { refresh: true });
      
      if (cachedData) {
        // Convert CachedUserData to AppUser format with proper type casting
        const userData: AppUser = {
          id: cachedData.id,
          email: cachedData.email,
          name: cachedData.name,
          role: cachedData.role,
          createdAt: '',
          tradingViewId: cachedData.tradingViewId || undefined,
          subscription: {
            plan: cachedData.subscription.plan as 'basic' | 'premium' | 'ultimate' | 'lifetime',
            startDate: cachedData.subscription.startDate,
            endDate: cachedData.subscription.endDate,
            daysRemaining: cachedData.subscription.daysRemaining,
            isActive: cachedData.subscription.isActive,
            status: cachedData.subscription.status as 'active' | 'expired' | 'pending',
          },
          billingHistory: cachedData.billingHistory.map(b => {
            const paymentMethod = (b.paymentMethod || '').toString().toLowerCase();
            const isCard = paymentMethod === 'credit_card' || paymentMethod === 'card' || paymentMethod === 'polar' || paymentMethod === 'credit card';
            const normalizedStatus = String(b.status) === 'completed' ? 'paid' : b.status;
            return {
              ...b,
              status: normalizedStatus as 'paid' | 'pending' | 'refunded',
              paymentMethod: isCard ? 'credit_card' : 'crypto',
              addedBy: 'System',
            };
          }),
          cancellationRequest: cachedData.cancellationRequest ? {
            id: cachedData.cancellationRequest.id,
            requestDate: '',
            reason: '',
            status: cachedData.cancellationRequest.status as 'pending' | 'approved' | 'rejected',
          } : undefined,
          refundRequest: cachedData.refundRequest ? {
            id: cachedData.refundRequest.id,
            requestDate: '',
            reason: '',
            status: cachedData.refundRequest.status as 'pending' | 'approved' | 'rejected',
          } : undefined,
        };
        
        setCurrentUser(userData);
        if (!profileNameDirtyRef.current) {
          setProfileName(cachedData.name || 'User');
        }
        setTradingViewId(cachedData.tradingViewId || '');
        // Use database avatar only (single source of truth)
        setAvatarUrl(cachedData.avatarUrl || null);
        // Update admin status
        const adminStatus = cachedData.role === 'admin';
        console.log('User role from cache:', cachedData.role, 'isAdmin:', adminStatus);
        setIsAdmin(adminStatus);
      } else {
        // Fallback to store if cache fails
        const userData = await getUser(user.id);
        if (userData) {
          setCurrentUser(userData);
          if (!profileNameDirtyRef.current) {
            setProfileName(userData.name || 'User');
          }
          setTradingViewId(userData.tradingViewId || '');
          setAvatarUrl(null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      const userData = await getUser(user.id);
      if (userData) {
        setCurrentUser(userData);
        if (!profileNameDirtyRef.current) {
          setProfileName(userData.name || 'User');
        }
        setTradingViewId(userData.tradingViewId || '');
        setAvatarUrl(null);
      }
    }
  };

  const loadTickets = async () => {
    try {
      const response = await fetch(`/api/tickets?userId=${user.id}`);
      if (response.ok) {
        const tickets = await response.json();
        setUserTickets(tickets);
        // Update selected ticket if it exists
        if (selectedTicket) {
          const updated = tickets.find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      } else {
        // Fallback to store
        const tickets = await getTicketsByUser(user.id);
        setUserTickets(tickets);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      const tickets = await getTicketsByUser(user.id);
      setUserTickets(tickets);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarUrl(data.avatarUrl);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload image');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const savedCooldownEnd = localStorage.getItem('verificationCooldownEnd');
    if (savedCooldownEnd) {
      const remaining = Math.floor((parseInt(savedCooldownEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setResendCooldown(remaining);
      } else {
        localStorage.removeItem('verificationCooldownEnd');
      }
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            localStorage.removeItem('verificationCooldownEnd');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Initial load + realtime updates
  useEffect(() => {
    loadUserData();
    loadTickets();

    // If coming back from Polar success, refresh more aggressively for a short time
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        const burstInterval = setInterval(loadUserData, 2000);
        setTimeout(() => {
          clearInterval(burstInterval);
        }, 30000);
      }
    }

    const supabase = createClient();

    const userChannel = supabase
      .channel(`user-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        () => {
          loadUserData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => {
          loadUserData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'billing_history', filter: `user_id=eq.${user.id}` },
        () => {
          loadUserData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cancellation_requests', filter: `user_id=eq.${user.id}` },
        () => {
          loadUserData();
        }
      )
      .subscribe();

    const ticketChannel = supabase
      .channel(`user-tickets-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` },
        () => {
          loadTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_messages' },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    const refundChannel = supabase
      .channel(`user-refunds-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'refund_requests', filter: `user_id=eq.${user.id}` },
        () => {
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(refundChannel);
    };
  }, [user.id]);

  // Polling for user data (subscription, billing) - backup for realtime
  useEffect(() => {
    // Poll immediately on mount
    loadUserData();
    
    const pollInterval = setInterval(loadUserData, 3000); // Every 3 seconds
    return () => clearInterval(pollInterval);
  }, [user.id, user.email]);

  // Polling for live ticket updates while on dashboard
  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch(`/api/tickets?userId=${user.id}`);
        if (response.ok) {
          const tickets = await response.json();
          setUserTickets(tickets);
          // Update selected ticket if exists
          if (selectedTicket) {
            const updated = tickets.find((t: SupportTicket) => t.id === selectedTicket.id);
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
  }, [selectedTicket?.id, user.id]);

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      alert('Please fill in the subject and message fields');
      return;
    }

    try {
      // Upload attachment first if exists
      let attachmentUrl = null;
      let attachmentPath = null;
      if (ticketAttachment) {
        setTicketAttachmentUploading(true);
        const formData = new FormData();
        formData.append('file', ticketAttachment);
        formData.append('ticketId', 'new-' + Date.now());
        formData.append('userId', user.id);
        
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subject: newTicketSubject,
          message: newTicketMessage,
          category: newTicketCategory,
          attachmentUrl,
          attachmentPath,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to create ticket'));
        return;
      }

      const result = await response.json();
      const newTicketId = result.ticketId;
      
      // Close modal first
      setShowNewTicketModal(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketCategory('general');
      setTicketAttachment(null);
      setTicketAttachmentUrl(null);

      // Wait a moment for database to update, then fetch and open the new ticket
      setTimeout(async () => {
        try {
          const ticketsResponse = await fetch(`/api/tickets?userId=${user.id}`);
          if (ticketsResponse.ok) {
            const tickets = await ticketsResponse.json();
            setUserTickets(tickets);
            const newTicket = tickets.find((t: SupportTicket) => t.id === newTicketId);
            if (newTicket) {
              setSelectedTicket(newTicket);
            }
          }
        } catch (e) {
          console.error('Error fetching new ticket:', e);
        }
      }, 500);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('An error occurred');
    }
  };

  const handleSendReply = async () => {
    // Allow sending with only attachment OR text; prevent duplicate sends
    if (!selectedTicket || (!replyMessage.trim() && !ticketAttachment) || replySending) return;

    setReplySending(true);
    try {
      // Upload attachment first if exists
      let attachmentUrl = null;
      let attachmentPath = null;
      if (ticketAttachment) {
        setTicketAttachmentUploading(true);
        const formData = new FormData();
        formData.append('file', ticketAttachment);
        formData.append('ticketId', selectedTicket.id);
        formData.append('userId', user.id);
        
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
          userId: user.id,
          message: replyMessage,
          attachmentUrl,
          attachmentPath,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to send message'));
        return;
      }

      // Reload tickets to get updated messages
      await loadTickets();
      // Reload selected ticket
      const ticketsResponse = await fetch(`/api/tickets?userId=${user.id}`);
      if (ticketsResponse.ok) {
        const allTickets = await ticketsResponse.json();
        const updated = allTickets.find((t: any) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
      setReplyMessage('');
      setTicketAttachment(null);
      setTicketAttachmentUrl(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('An error occurred');
    } finally {
      setReplySending(false);
    }
  };

  // Dynamic subscription data from store
  // Basic plan = unlimited (no expiry)
  const isBasicPlan = !currentUser || currentUser.subscription.plan.toLowerCase() === 'basic';
  const subscriptionData = currentUser ? {
    plan: currentUser.subscription.plan.charAt(0).toUpperCase() + currentUser.subscription.plan.slice(1),
    daysActive: currentUser.subscription.startDate 
      ? Math.floor((Date.now() - new Date(currentUser.subscription.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    // Basic plan has unlimited days
    daysRemaining: isBasicPlan ? -1 : currentUser.subscription.daysRemaining,
    startDate: currentUser.subscription.startDate,
    // Basic plan has no end date
    endDate: isBasicPlan ? 'Unlimited' : (currentUser.subscription.endDate || 'Unlimited'),
    status: currentUser.subscription.status,
  } : {
    plan: 'Basic',
    daysActive: 0,
    daysRemaining: -1,
    startDate: '',
    endDate: 'Unlimited',
    status: 'active' as const,
  };

  // Dynamic billing history from store
  const billingHistory = currentUser?.billingHistory || [];

  const getFirstPaidPurchaseDate = () => {
    const paid = billingHistory.filter((b) => {
      const amount = parseFloat(b.amount.replace(/[^0-9.]/g, '')) || 0;
      const isExtension = /extension/i.test(b.plan || '');
      const isPaid = b.status === 'paid';
      return isPaid && amount > 0 && !isExtension;
    });

    if (paid.length === 0) return null;
    const sorted = [...paid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[0].date || null;
  };

  // Check if a specific invoice is eligible for refund
  // Refund eligible: non-extension, paid, not crypto, within 3 days
  const isInvoiceRefundEligible = (invoice: { id: string; date: string; status: string; plan: string; amount: string; paymentMethod?: string; polarOrderId?: string; hasPendingRefund?: boolean; billingReason?: string | null }) => {
    // Must be paid
    const isPaid = invoice.status === 'paid';
    if (!isPaid) return false;

    // Must not be already refunded
    if (invoice.status === 'refunded') return false;

    // Must have positive amount
    const amount = parseFloat(invoice.amount.replace(/[^0-9.]/g, '')) || 0;
    if (amount <= 0) return false;

    // Only subscription purchases (initial) are refundable
    if (invoice.billingReason && invoice.billingReason !== 'subscription_create') return false;

    // Extension purchases are not eligible for refund
    const isExtension = /extension/i.test(invoice.plan || '') || invoice.billingReason === 'subscription_extend';
    if (isExtension) return false;

    // Crypto payments are not eligible for refund
    if (invoice.paymentMethod === 'crypto') return false;

    // Check if within 3 days of invoice date
    const invoiceDate = new Date(invoice.date);
    if (Number.isNaN(invoiceDate.getTime())) return false;

    const now = new Date();
    const startOfInvoice = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate());
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfInvoice.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays < 3;
  };

  // Check if cancellation is allowed (not for crypto payments)
  const isCancellationAllowed = () => {
    if (!currentUser || currentUser.subscription.plan === 'basic') return false;
    
    // Check if latest payment was crypto - no cancellation for crypto
    const latestPaidBilling = [...billingHistory]
      .filter(b => b.status === 'paid' && parseFloat(b.amount.replace(/[^0-9.]/g, '')) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // If no billing history yet, do not allow cancellation
    if (!latestPaidBilling) return false;

    if (latestPaidBilling?.paymentMethod === 'crypto') return false;

    return true;
  };

  const handleLogout = async () => {
    // Sign out from Supabase
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) {
      alert('Please specify your cancellation reason.');
      return;
    }
    
    try {
      // Use API for cancellation request
      const response = await fetch('/api/admin/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: cancelReason,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to submit request'));
        return;
      }
      
      setShowCancelModal(false);
      setCancelReason('');
      await loadUserData();
      alert('Your cancellation request has been submitted. It will be processed after admin approval.');
    } catch (error) {
      console.error('Error submitting cancellation:', error);
      alert('An error occurred');
    }
  };

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) {
      alert('Please specify your refund reason.');
      return;
    }

    if (!selectedInvoiceForRefund) {
      alert('No invoice selected for refund.');
      return;
    }

    try {
      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reason: refundReason,
          billingHistoryId: selectedInvoiceForRefund.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to submit refund request'));
        return;
      }

      setShowRefundModal(false);
      setRefundReason('');
      setSelectedInvoiceForRefund(null);
      await loadUserData();
      alert('Your refund request has been submitted. It will be reviewed by admin.');
    } catch (error) {
      console.error('Error submitting refund request:', error);
      alert('An error occurred');
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaveError('');
    try {
      // Build update payload - only include tradingViewId if not already set
      const updatePayload: Record<string, any> = {
        userId: currentUser?.id,
        fullName: profileName,
      };
      
      // Only include tradingViewId if user doesn't already have one set
      if (!currentUser?.tradingViewId && tradingViewId) {
        updatePayload.tradingviewUsername = tradingViewId;
      }
      
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        setProfileSaveError(error.error || 'Failed to update profile');
        return;
      }

      setProfileSaved(true);
      profileNameDirtyRef.current = false;
      setTimeout(() => setProfileSaved(false), 3000);
      await loadUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      setProfileSaveError('An error occurred while saving profile');
    }
  };

  const sendVerificationCode = async (type: 'email' | 'password') => {
    if (verificationLoading || resendCooldown > 0) return;

    setVerificationType(type);
    setVerificationError('');
    setDemoCode('');
    setVerificationLoading(true);

    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profileEmail,
          type: type === 'email' ? 'email-change' : 'password-change',
          userName: profileName,
          newEmail: type === 'email' ? newEmail : undefined,
          newPassword: type === 'password' ? newPassword : undefined,
          currentPassword: type === 'password' ? currentPassword : undefined,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationError(data.error || 'Failed to send verification code');
        return;
      }

      setVerificationSent(true);
      setShowVerificationModal(true);

      const cooldownSeconds = 60;
      const cooldownEnd = Date.now() + cooldownSeconds * 1000;
      localStorage.setItem('verificationCooldownEnd', cooldownEnd.toString());
      setResendCooldown(cooldownSeconds);

      if (data.demoCode) {
        setDemoCode(data.demoCode);
      }
    } catch (error) {
      setVerificationError('Failed to send verification code');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setVerificationError('Please enter the 6-digit code');
      return;
    }

    setVerificationError('');
    setVerificationLoading(true);

    try {
      const response = await fetch('/api/send-verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profileEmail,
          code: verificationCode,
          newPassword: verificationType === 'password' ? newPassword : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowVerificationModal(false);
        setVerificationCode('');
        setVerificationSent(false);

        // Clear resend cooldown after successful change
        setResendCooldown(0);
        localStorage.removeItem('verificationCooldownEnd');

        if (data.type === 'email-change' && data.newEmail) {
          setProfileEmail(data.newEmail);
          setNewEmail('');
          alert('Your email address has been successfully changed! You will be logged out.');
          // Email changed - log out and redirect to login
          const supabase = createClient();
          await supabase.auth.signOut();
          clearUserCache();
          router.push('/login');
        } else if (data.type === 'password-change') {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          alert('Your password has been successfully changed! Please log in with your new password.');
          // Password changed - log out and redirect to login
          const supabase = createClient();
          await supabase.auth.signOut();
          clearUserCache();
          router.push('/login');
        }

        // Reload user data (only if not redirecting)
        // await loadUserData();
      } else {
        setVerificationError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setVerificationError('An error occurred');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Handle email change
  const handleEmailChange = () => {
    setEmailFieldError(false);
    setVerificationError('');
    
    if (!newEmail || newEmail === profileEmail) {
      setEmailFieldError(true);
      setTimeout(() => setEmailFieldError(false), 3000);
      return;
    }
    
    if (!isValidEmail(newEmail)) {
      setEmailFieldError(true);
      setTimeout(() => setEmailFieldError(false), 3000);
      return;
    }
    
    sendVerificationCode('email');
  };

  // Handle password change
  const handlePasswordChange = () => {
    setPasswordError('');
    setCurrentPasswordError(false);
    setNewPasswordError(false);
    setConfirmPasswordError(false);
    
    let hasError = false;
    
    if (!currentPassword) {
      setCurrentPasswordError(true);
      hasError = true;
    }
    if (!newPassword) {
      setNewPasswordError(true);
      hasError = true;
    }
    if (!confirmPassword) {
      setConfirmPasswordError(true);
      hasError = true;
    }
    
    if (hasError) {
      setTimeout(() => {
        setCurrentPasswordError(false);
        setNewPasswordError(false);
        setConfirmPasswordError(false);
      }, 3000);
      return;
    }
    
    if (newPassword.length < 8) {
      setNewPasswordError(true);
      setPasswordError('Password must be at least 8 characters');
      setTimeout(() => setNewPasswordError(false), 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(true);
      setPasswordError('Passwords do not match');
      setTimeout(() => setConfirmPasswordError(false), 3000);
      return;
    }
    
    sendVerificationCode('password');
  };

  const navigation = [
    { name: 'Home', id: 'home', icon: Home, isLink: true, href: '/' },
    { name: 'FibAlgo Hub', id: 'terminal', icon: Zap, isLink: true, href: '/terminal' },
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'Subscription', id: 'subscription', icon: CreditCard },
    { name: 'Support', id: 'support', icon: MessageCircle },
    { name: 'Settings', id: 'settings', icon: Settings },
    // Admin Panel - only visible for admin users (uses persisted isAdmin state)
    ...(isAdmin ? [{ name: 'Admin Panel', id: 'admin', icon: Shield, isLink: true, href: '/admin' }] : []),
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0F',
      position: 'relative'
    }}>
      <AnimatedBackground />
      
      {/* Payment Processing Overlay */}
      {paymentSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '3rem',
            background: 'rgba(0,245,255,0.05)',
            border: '1px solid rgba(0,245,255,0.2)',
            borderRadius: '1.5rem',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}>
              <CheckCircle style={{ width: '40px', height: '40px', color: '#0A0A0F' }} />
            </div>
            <h2 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>
              Payment Successful!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, textAlign: 'center' }}>
              Activating your subscription...
            </p>
            <Loader2 style={{ width: '24px', height: '24px', color: '#00F5FF', animation: 'spin 1s linear infinite' }} />
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.8; }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#f87171' }} />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Subscription Cancellation Request</h3>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Your cancellation request will be sent to admin for approval. Once approved, you will be switched to Basic plan.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please describe why you want to cancel"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCancelSubscription}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {showRefundModal && selectedInvoiceForRefund && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(251,191,36,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard style={{ width: '24px', height: '24px', color: '#fbbf24' }} />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Refund Request</h3>
            </div>
            
            {/* Selected Invoice Info */}
            <div style={{ 
              background: 'rgba(251,191,36,0.1)', 
              border: '1px solid rgba(251,191,36,0.3)', 
              borderRadius: '0.5rem', 
              padding: '0.75rem', 
              marginBottom: '1rem' 
            }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: '0 0 0.25rem 0' }}>Requesting refund for:</p>
              <p style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                {selectedInvoiceForRefund.plan} • {selectedInvoiceForRefund.date}
              </p>
            </div>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', lineHeight: 1.6, fontSize: '0.85rem' }}>
              Refund requests are available within 3 days of purchase. Your request will be reviewed by admin.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Reason for Refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please describe why you want a refund"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowRefundModal(false); setRefundReason(''); setSelectedInvoiceForRefund(null); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRefundRequest}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>New Support Ticket</h3>
            </div>

            {/* Category */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Category</label>
              <select
                value={newTicketCategory}
                onChange={(e) => setNewTicketCategory(e.target.value as SupportTicket['category'])}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0A0A0B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="general" style={{ background: '#0A0A0B', color: '#FFFFFF' }}>General Question</option>
                <option value="billing" style={{ background: '#0A0A0B', color: '#FFFFFF' }}>Billing / Payment</option>
                <option value="technical" style={{ background: '#0A0A0B', color: '#FFFFFF' }}>Technical Support</option>
                <option value="cancellation" style={{ background: '#0A0A0B', color: '#FFFFFF' }}>Cancellation Request</option>
                <option value="other" style={{ background: '#0A0A0B', color: '#FFFFFF' }}>Other</option>
              </select>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Subject</label>
              <input
                type="text"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                placeholder="Briefly describe your issue"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Message</label>
              <textarea
                value={newTicketMessage}
                onChange={(e) => setNewTicketMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Attachment */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Attachment <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>(optional - max 10MB)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  borderRadius: '0.5rem',
                  color: ticketAttachment ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}>
                  <Camera style={{ width: '16px', height: '16px' }} />
                  {ticketAttachment ? ticketAttachment.name : 'Click to add image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size must be less than 10MB');
                          return;
                        }
                        setTicketAttachment(file);
                        setTicketAttachmentUrl(URL.createObjectURL(file));
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {ticketAttachment && (
                  <button
                    onClick={() => { setTicketAttachment(null); setTicketAttachmentUrl(null); }}
                    style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer' }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                )}
              </div>
              {ticketAttachmentUrl && (
                <div style={{ marginTop: '0.5rem', borderRadius: '0.5rem', overflow: 'hidden', maxHeight: '150px' }}>
                  <img src={ticketAttachmentUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowNewTicketModal(false); setNewTicketSubject(''); setNewTicketMessage(''); setTicketAttachment(null); setTicketAttachmentUrl(null); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={ticketAttachmentUploading}
                style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', border: 'none', borderRadius: '0.5rem', color: '#000', fontWeight: 600, cursor: ticketAttachmentUploading ? 'wait' : 'pointer', opacity: ticketAttachmentUploading ? 0.7 : 1 }}
              >
                {ticketAttachmentUploading ? 'Uploading...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', padding: '1rem' }}>
          <div style={{ background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(0,245,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {verificationType === 'email' ? (
                  <Mail style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
                ) : (
                  <Lock style={{ width: '24px', height: '24px', color: '#00F5FF' }} />
                )}
              </div>
              <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                {verificationType === 'email' ? 'Verify Email Change' : 'Verify Password Change'}
              </h3>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', lineHeight: 1.6 }}>
              We sent a 6-digit code to <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{profileEmail}</span>.
            </p>

            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter code"
              maxLength={6}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                color: '#FFFFFF',
                fontSize: '1rem',
                outline: 'none',
                marginBottom: '0.75rem',
                textAlign: 'center',
                letterSpacing: '0.2rem',
              }}
            />

            {verificationError && (
              <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>{verificationError}</p>
            )}

            {demoCode && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 0.75rem 0' }}>
                Demo code: {demoCode}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => { setShowVerificationModal(false); setVerificationCode(''); setVerificationError(''); }}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || verificationLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: verificationCode.length === 6 ? 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: verificationCode.length === 6 ? '#000' : 'rgba(255,255,255,0.3)',
                  fontWeight: 600,
                  cursor: verificationCode.length === 6 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {verificationLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : 'Verify'}
              </button>
            </div>

            <button
              onClick={() => sendVerificationCode(verificationType)}
              disabled={verificationLoading || resendCooldown > 0}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.5rem',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
                cursor: verificationLoading || resendCooldown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: isMobile ? '80vw' : '280px',
          maxWidth: '280px',
          background: '#0A0A0F',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
          transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 1rem 1rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Image src="/logo-white.svg" alt="FibAlgo Logo" width={120} height={32} />
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
            // Calculate total unread for support tab - exclude closed/resolved tickets
            const totalUnread = item.id === 'support' 
              ? userTickets
                  .filter(t => t.status !== 'closed' && t.status !== 'resolved')
                  .reduce((sum, t) => sum + ((t as any).unreadForUser || 0), 0)
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
                background: activeTab === item.id ? 'rgba(0,245,255,0.1)' : 'transparent',
                color: activeTab === item.id ? '#00F5FF' : 'rgba(255,255,255,0.5)',
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
                  background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                  color: '#000',
                }}>
                  {totalUnread}
                </span>
              )}
            </button>
          )})}
        </nav>

        {/* User Profile */}
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
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: avatarUrl ? '2px solid #00F5FF' : 'none',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User style={{ width: '20px', height: '20px', color: '#0A0A0F' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {profileName}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {profileEmail}
              </p>
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
      <div style={{ marginLeft: isMobile ? 0 : '280px', minHeight: '100vh' }}>
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
              <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                {navigation.find(n => n.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: isMobile ? '1rem' : '1.5rem', maxWidth: isMobile ? '100%' : '900px', margin: '0 auto' }}>
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  Welcome, {profileName.split(' ')[0]}! 👋
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  Your subscription status and account information are below.
                </p>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {/* Active Plan */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Active Plan</span>
                    <Crown style={{ 
                      width: '20px', 
                      height: '20px', 
                      color: subscriptionData.plan === 'Lifetime' ? '#FFD700' : subscriptionData.plan === 'Basic' ? '#60a5fa' : subscriptionData.plan === 'Ultimate' ? '#A855F7' : '#00F5FF' 
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    color: subscriptionData.plan === 'Lifetime' ? '#FFD700' : subscriptionData.plan === 'Basic' ? '#60a5fa' : subscriptionData.plan === 'Ultimate' ? '#A855F7' : '#00F5FF' 
                  }}>
                    {subscriptionData.plan}
                  </div>
                </div>

                {/* Days Active */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Days Active</span>
                    <Clock style={{ width: '20px', height: '20px', color: '#00F5FF' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00F5FF' }}>{subscriptionData.daysActive}</div>
                </div>

                {/* Days Remaining */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Days Remaining</span>
                    <Calendar style={{ width: '20px', height: '20px', color: '#BF00FF' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#BF00FF' }}>
                    {subscriptionData.daysRemaining === -1 ? '∞' : subscriptionData.daysRemaining}
                  </div>
                </div>

              </div>

              {/* Subscription Info */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem' }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', margin: '0 0 1rem 0' }}>Subscription Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Start Date</span>
                    <span style={{ color: '#FFFFFF' }} suppressHydrationWarning>{subscriptionData.startDate || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>End Date</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        color: currentUser?.cancellationRequest?.status === 'approved' ? '#fbbf24' : '#FFFFFF' 
                      }} suppressHydrationWarning>
                        {subscriptionData.endDate}
                      </span>
                      {currentUser?.cancellationRequest?.status === 'approved' && (
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                          ⚠️ Subscription will end on this date
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Status</span>
                    <span style={{ 
                      color: currentUser?.cancellationRequest?.status === 'approved' ? '#fbbf24' :
                             subscriptionData.status === 'active' ? '#4ade80' : 
                             subscriptionData.status === 'expired' ? '#f87171' : '#fbbf24',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.25rem' 
                    }}>
                      {currentUser?.cancellationRequest?.status === 'approved' && <><AlertTriangle style={{ width: '16px', height: '16px' }} /> Cancelling</>}
                      {currentUser?.cancellationRequest?.status !== 'approved' && subscriptionData.status === 'active' && <><Check style={{ width: '16px', height: '16px' }} /> Active</>}
                      {currentUser?.cancellationRequest?.status !== 'approved' && subscriptionData.status === 'expired' && <><AlertCircle style={{ width: '16px', height: '16px' }} /> Expired</>}
                      {currentUser?.cancellationRequest?.status !== 'approved' && subscriptionData.status === 'pending' && <><Clock style={{ width: '16px', height: '16px' }} /> Pending</>}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Subscription Management</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Manage your subscription and add time.</p>
              </div>

              {/* Current Plan */}
              <div style={{ 
                background: subscriptionData.plan === 'Lifetime'
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,140,0,0.1) 100%)'
                  : subscriptionData.plan === 'Basic' 
                    ? 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(59,130,246,0.1) 100%)'
                    : subscriptionData.plan === 'Ultimate'
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(139,92,246,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(191,0,255,0.1) 100%)', 
                border: subscriptionData.plan === 'Lifetime'
                  ? '1px solid rgba(255,215,0,0.3)'
                  : subscriptionData.plan === 'Basic' 
                    ? '1px solid rgba(96,165,250,0.3)' 
                    : subscriptionData.plan === 'Ultimate'
                      ? '1px solid rgba(168,85,247,0.3)'
                      : '1px solid rgba(0,245,255,0.3)', 
                borderRadius: '1rem', 
                padding: '1.5rem', 
                marginBottom: '1.5rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Crown style={{ 
                    width: '32px', 
                    height: '32px', 
                    color: subscriptionData.plan === 'Lifetime' ? '#FFD700' : subscriptionData.plan === 'Basic' ? '#60a5fa' : subscriptionData.plan === 'Ultimate' ? '#A855F7' : '#00F5FF' 
                  }} />
                  <div>
                    <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{subscriptionData.plan} Plan</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
                      {subscriptionData.plan === 'Basic' ? 'Access to basic features' : subscriptionData.plan === 'Lifetime' ? 'Lifetime access to all features' : 'Access to all premium features'}
                    </p>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Time remaining</span>
                    <span style={{ color: '#00F5FF', fontWeight: 600 }}>
                      {subscriptionData.daysRemaining === -1 ? '∞ Unlimited' : `${subscriptionData.daysRemaining} days`}
                    </span>
                  </div>
                  {subscriptionData.daysRemaining !== -1 && (
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ background: 'linear-gradient(90deg, #00F5FF, #BF00FF)', height: '100%', width: `${Math.min((subscriptionData.daysRemaining / 30) * 100, 100)}%`, borderRadius: '9999px' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Billing History */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Receipt style={{ width: '20px', height: '20px', color: '#00F5FF' }} />
                  <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Billing History</h3>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {billingHistory.map((invoice, index) => (
                    <div 
                      key={invoice.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1rem 1.25rem',
                        borderBottom: index < billingHistory.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          background: invoice.status === 'paid' ? 'rgba(74,222,128,0.1)' : invoice.status === 'refunded' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', 
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {invoice.status === 'paid' ? (
                            <CheckCircle style={{ width: '20px', height: '20px', color: '#4ade80' }} />
                          ) : invoice.status === 'refunded' ? (
                            <XCircle style={{ width: '20px', height: '20px', color: '#f87171' }} />
                          ) : (
                            <Receipt style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.5)' }} />
                          )}
                        </div>
                        <div>
                          <p style={{ color: invoice.status === 'refunded' ? 'rgba(255,255,255,0.5)' : '#FFFFFF', fontSize: '0.875rem', fontWeight: 500, margin: 0, textDecoration: invoice.status === 'refunded' ? 'line-through' : 'none' }}>{invoice.plan}</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                            {(invoice as any).displayId || invoice.id} • {invoice.date}
                            {invoice.paymentMethod === 'crypto' && (
                              <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontWeight: 500 }}>• Crypto</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <p style={{ color: invoice.status === 'refunded' ? '#f87171' : '#FFFFFF', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>{invoice.amount}</p>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '0.125rem 0.5rem', 
                            borderRadius: '9999px',
                            background: invoice.status === 'paid' ? 'rgba(74,222,128,0.2)' : invoice.status === 'refunded' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                            color: invoice.status === 'paid' ? '#4ade80' : invoice.status === 'refunded' ? '#f87171' : 'rgba(255,255,255,0.5)',
                          }}>
                            {invoice.status === 'paid' ? 'Paid' : invoice.status === 'refunded' ? 'Refunded' : 'Basic'}
                          </span>
                        </div>
                        {/* Refund Request Button - shows for eligible invoices within 3 days */}
                        {invoice.hasPendingRefund ? (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.375rem 0.625rem',
                              background: 'rgba(251,191,36,0.15)',
                              border: '1px solid rgba(251,191,36,0.4)',
                              borderRadius: '0.375rem',
                              color: '#fbbf24',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title="Refund request is pending review"
                          >
                            ⏳ Pending
                          </span>
                        ) : isInvoiceRefundEligible(invoice) && (
                          <button
                            onClick={() => {
                              setSelectedInvoiceForRefund({ id: invoice.id, plan: invoice.plan, date: invoice.date });
                              setShowRefundModal(true);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.375rem 0.625rem',
                              background: 'rgba(251,191,36,0.15)',
                              border: '1px solid rgba(251,191,36,0.4)',
                              borderRadius: '0.375rem',
                              color: '#fbbf24',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            title="Request refund for this invoice"
                          >
                            Refund
                          </button>
                        )}
                        {invoice.invoiceUrl && invoice.status === 'paid' && (
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              background: 'rgba(0,245,255,0.1)',
                              border: '1px solid rgba(0,245,255,0.3)',
                              borderRadius: '0.5rem',
                              color: '#00F5FF',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="View Invoice"
                          >
                            <ExternalLink style={{ width: '16px', height: '16px' }} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {billingHistory.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      No billing history yet.
                    </div>
                  )}
                </div>
              </div>

              {currentUser?.cancellationRequest?.status === 'approved' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Current Plan</span>
                      <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>{subscriptionData.plan}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Access Until</span>
                      <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}>{subscriptionData.endDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Days Remaining</span>
                      <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}>{subscriptionData.daysRemaining === -1 ? '∞' : subscriptionData.daysRemaining}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>After End Date</span>
                      <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.85rem' }}>Basic Plan</span>
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.75rem 0 0 0', lineHeight: 1.5 }}>
                    ℹ️ Your {subscriptionData.plan} subscription will remain fully active until {subscriptionData.endDate}. 
                    After that, you will be automatically switched to Basic plan.
                  </p>
                </div>
              )}

              {/* Cancel Button - Only for paid, active plans without pending/approved cancellation and not crypto */}
              {subscriptionData.plan !== 'Basic' && 
               subscriptionData.status === 'active' && 
               isCancellationAllowed() &&
               currentUser?.cancellationRequest?.status !== 'pending' &&
               currentUser?.cancellationRequest?.status !== 'approved' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '0.75rem',
                    color: '#f87171',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel Subscription
                </button>
              )}
            </>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Support Tickets</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Create a support ticket for your questions.</p>
                </div>
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  <Plus style={{ width: '18px', height: '18px' }} />
                  New Ticket
                </button>
              </div>

              {/* Ticket Detail View */}
              {selectedTicket ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                  {/* Ticket Header */}
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        style={{ background: 'none', border: 'none', color: '#00F5FF', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        ← Back
                      </button>
                      <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{selectedTicket.subject}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>#{selectedTicket.id}</p>
                    </div>
                    <span style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: selectedTicket.status === 'open' ? 'rgba(251,191,36,0.2)' : 
                                  selectedTicket.status === 'in-progress' ? 'rgba(0,245,255,0.2)' :
                                  selectedTicket.status === 'resolved' ? 'rgba(74,222,128,0.2)' : 'rgba(156,163,175,0.2)',
                      color: selectedTicket.status === 'open' ? '#fbbf24' : 
                             selectedTicket.status === 'in-progress' ? '#00F5FF' :
                             selectedTicket.status === 'resolved' ? '#4ade80' : '#9ca3af',
                    }}>
                      {selectedTicket.status === 'open' ? 'Open' :
                       selectedTicket.status === 'in-progress' ? 'In Progress' :
                       selectedTicket.status === 'resolved' ? 'Resolved' : 'Closed'}
                    </span>
                  </div>

                  {/* Messages */}
                  <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
                    {selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.senderRole === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{
                          maxWidth: '75%',
                          padding: '1rem',
                          borderRadius: msg.senderRole === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                          background: msg.senderRole === 'user' 
                            ? 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(0,168,255,0.2) 100%)'
                            : 'rgba(255,255,255,0.05)',
                          border: msg.senderRole === 'user'
                            ? '1px solid rgba(0,245,255,0.3)'
                            : '1px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ color: msg.senderRole === 'user' ? '#00F5FF' : '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                              {msg.senderRole === 'user' ? 'You' : 'FibAlgo - Support'}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                              {new Date(msg.timestamp).toLocaleString('en-US')}
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
                      {/* Attachment Preview */}
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
                        {/* Attachment Button */}
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
                                  alert('File size must be less than 10MB');
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
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !replySending && handleSendReply()}
                          placeholder="Type your message..."
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
                          onClick={handleSendReply}
                          disabled={(!replyMessage.trim() && !ticketAttachment) || ticketAttachmentUploading || replySending}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: ((replyMessage.trim() || ticketAttachment) && !ticketAttachmentUploading && !replySending) ? 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '0.75rem',
                            color: ((replyMessage.trim() || ticketAttachment) && !ticketAttachmentUploading && !replySending) ? '#000' : 'rgba(255,255,255,0.3)',
                            cursor: ((replyMessage.trim() || ticketAttachment) && !ticketAttachmentUploading && !replySending) ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          {(ticketAttachmentUploading || replySending) ? (
                            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Send style={{ width: '18px', height: '18px' }} />
                          )}
                          {replySending ? 'Sending...' : ''}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Ticket List */
                <>
                  {userTickets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userTickets.map((ticket) => {
                        // Don't show unread for closed/resolved tickets
                        const showUnread = (ticket as any).unreadForUser > 0 && ticket.status !== 'closed' && ticket.status !== 'resolved';
                        return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          style={{
                            background: showUnread ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.03)',
                            border: showUnread ? '1px solid rgba(0,245,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.75rem',
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{ticket.subject}</h4>
                              {/* Unread Badge - only show for open/in-progress tickets */}
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
                                  background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                                  color: '#000',
                                }}>
                                  {(ticket as any).unreadForUser}
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
                                {ticket.status === 'open' ? 'Open' :
                                 ticket.status === 'in-progress' ? 'In Progress' :
                                 ticket.status === 'resolved' ? 'Resolved' : 'Closed'}
                              </span>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>
                              {ticket.messages.length} messages • Last updated: {new Date(ticket.updatedAt).toLocaleDateString('en-US')}
                            </p>
                          </div>
                          <ChevronRight style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.3)' }} />
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <MessageCircle style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem' }} />
                      <p style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>No Support Tickets Yet</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '0.5rem 0 1.5rem 0' }}>Have a question? Create a new ticket.</p>
                      <button
                        onClick={() => setShowNewTicketModal(true)}
                        style={{
                          display: 'inline-flex',
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
                        <Plus style={{ width: '18px', height: '18px' }} />
                        Create New Ticket
                      </button>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>Account Settings</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Edit your profile information.</p>
              </div>

              {/* Profile Picture */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: avatarUrl ? '3px solid #00F5FF' : 'none',
                    }}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }} 
                      />
                    ) : (
                      <User style={{ width: '48px', height: '48px', color: '#0A0A0F' }} />
                    )}
                  </div>
                  <label
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '32px',
                      height: '32px',
                      background: '#00F5FF',
                      border: 'none',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: avatarUploading ? 'wait' : 'pointer',
                      opacity: avatarUploading ? 0.7 : 1,
                    }}
                  >
                    {avatarUploading ? (
                      <Loader2 style={{ width: '16px', height: '16px', color: '#0A0A0F', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Camera style={{ width: '16px', height: '16px', color: '#0A0A0F' }} />
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: avatarUploading ? 'wait' : 'pointer',
                      }}
                    />
                  </label>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
                  {avatarUploading ? 'Uploading...' : 'Click to change photo'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                  JPEG, PNG, WebP or GIF (max 5MB)
                </p>
              </div>

              {/* Profile Form */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User style={{ width: '18px', height: '18px', color: '#00F5FF' }} />
                  Profile Information
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        profileNameDirtyRef.current = true;
                      }}
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

                  {/* TradingView ID */}
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      TradingView ID
                      {currentUser?.tradingViewId && (
                        <span style={{ marginLeft: '0.5rem', color: '#4ade80', fontSize: '0.75rem' }}>
                          (Locked - Contact support to change)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={tradingViewId || ''}
                      onChange={(e) => !currentUser?.tradingViewId && setTradingViewId(e.target.value)}
                      placeholder={currentUser?.tradingViewId ? '' : 'tradingview.com/u/your_username'}
                      disabled={!!currentUser?.tradingViewId}
                      readOnly={!!currentUser?.tradingViewId}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        background: currentUser?.tradingViewId ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${currentUser?.tradingViewId ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '0.75rem',
                        color: currentUser?.tradingViewId ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: currentUser?.tradingViewId ? 'not-allowed' : 'text',
                      }}
                    />
                    {currentUser?.tradingViewId === 'NO_INDICATORS' && (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        You opted out of TradingView indicators
                      </p>
                    )}
                  </div>

                  {/* Error Message */}
                  {profileSaveError && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '0.75rem',
                      color: '#f87171',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      {profileSaveError}
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleSaveProfile}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: profileSaved ? '#4ade80' : 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
                      border: 'none',
                      borderRadius: '0.75rem',
                      color: '#000',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    {profileSaved ? (
                      <>
                        <Check style={{ width: '18px', height: '18px' }} />
                        Saved!
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>

              {/* Email Change Section */}
              {isOAuthUser ? (
                <div style={{ 
                  background: 'rgba(248,113,113,0.1)', 
                  border: '1px solid rgba(248,113,113,0.3)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <h3 style={{ color: '#f87171', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail style={{ width: '18px', height: '18px', color: '#f87171' }} />
                    Change Email
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(248,113,113,0.1)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(248,113,113,0.2)'
                  }}>
                    <AlertCircle style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
                        Email change is not available
                      </p>
                      <p style={{ color: 'rgba(248,113,113,0.8)', fontSize: '0.8rem', margin: 0 }}>
                        You signed up with {oauthProviderName}. Your email is managed by your {oauthProviderName} account and cannot be changed here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail style={{ width: '18px', height: '18px', color: '#00F5FF' }} />
                  Change Email
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 1.25rem 0' }}>
                  You can change your email once every 30 days.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Current Email */}
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '1rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* New Email */}
                  <div>
                    <label style={{ display: 'block', color: emailFieldError ? '#f87171' : 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>New Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => { setNewEmail(e.target.value); setEmailFieldError(false); }}
                      placeholder="new@email.com"
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        background: emailFieldError ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                        border: emailFieldError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxShadow: emailFieldError ? '0 0 10px rgba(248,113,113,0.3)' : 'none',
                      }}
                    />
                  </div>

                  {verificationError && verificationType === 'email' && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '0.75rem',
                      color: '#f87171',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      {verificationError}
                    </div>
                  )}

                  <button
                    onClick={handleEmailChange}
                    disabled={verificationLoading}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.75rem',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {verificationLoading && verificationType === 'email' ? (
                      <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <Mail style={{ width: '18px', height: '18px' }} />
                        Send Verification Code
                      </>
                    )}
                  </button>
                </div>
              </div>
              )}

              {/* Password Change Section */}
              {isOAuthUser ? (
                <div style={{ 
                  background: 'rgba(248,113,113,0.1)', 
                  border: '1px solid rgba(248,113,113,0.3)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <h3 style={{ color: '#f87171', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock style={{ width: '18px', height: '18px', color: '#f87171' }} />
                    Change Password
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'rgba(248,113,113,0.1)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(248,113,113,0.2)'
                  }}>
                    <AlertCircle style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
                        Password change is not available
                      </p>
                      <p style={{ color: 'rgba(248,113,113,0.8)', fontSize: '0.8rem', margin: 0 }}>
                        You signed up with {oauthProviderName}. Your password is managed by your {oauthProviderName} account and cannot be changed here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock style={{ width: '18px', height: '18px', color: '#00F5FF' }} />
                  Change Password
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 1.25rem 0' }}>
                  You can change your password once every 24 hours.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Current Password */}
                  <div>
                    <label style={{ display: 'block', color: currentPasswordError ? '#f87171' : 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setCurrentPasswordError(false); }}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '0.875rem 3rem 0.875rem 1rem',
                          background: currentPasswordError ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                          border: currentPasswordError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxShadow: currentPasswordError ? '0 0 10px rgba(248,113,113,0.3)' : 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                        }}
                      >
                        {showCurrentPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label style={{ display: 'block', color: newPasswordError ? '#f87171' : 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setNewPasswordError(false); }}
                        placeholder="At least 8 characters"
                        style={{
                          width: '100%',
                          padding: '0.875rem 3rem 0.875rem 1rem',
                          background: newPasswordError ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                          border: newPasswordError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          color: '#FFFFFF',
                          fontSize: '1rem',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxShadow: newPasswordError ? '0 0 10px rgba(248,113,113,0.3)' : 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '1rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                        }}
                      >
                        {showNewPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={{ display: 'block', color: confirmPasswordError ? '#f87171' : 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(false); }}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        background: confirmPasswordError ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                        border: confirmPasswordError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxShadow: confirmPasswordError ? '0 0 10px rgba(248,113,113,0.3)' : 'none',
                      }}
                    />
                  </div>

                  {passwordError && (
                    <p style={{ color: '#f87171', fontSize: '0.875rem', margin: 0 }}>
                      {passwordError}
                    </p>
                  )}

                  {verificationError && verificationType === 'password' && (
                    <div style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '0.75rem',
                      color: '#f87171',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      {verificationError}
                    </div>
                  )}

                  <button
                    onClick={handlePasswordChange}
                    disabled={verificationLoading}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.75rem',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {verificationLoading && verificationType === 'password' ? (
                      <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <Mail style={{ width: '18px', height: '18px' }} />
                        Send Verification Code
                      </>
                    )}
                  </button>
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
