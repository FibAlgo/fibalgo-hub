// Global User Cache Service
// Provides instant user data from localStorage with background refresh

type PlanType = 'basic' | 'premium' | 'ultimate' | 'lifetime';
type SubscriptionStatus = 'active' | 'expired' | 'pending';
type BillingStatus = 'paid' | 'pending' | 'refunded';

export interface CachedUserData {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatarUrl: string | null;
  plan: PlanType;
  tradingViewId?: string | null;
  subscription: {
    plan: PlanType;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    isActive: boolean;
    status: SubscriptionStatus;
  };
  billingHistory: Array<{
    id: string;
    date: string;
    amount: string;
    plan: string;
    status: BillingStatus;
    paymentMethod?: 'crypto' | 'credit_card';
    billingReason?: string | null;
  }>;
  cancellationRequest?: {
    id: string;
    status: string;
  };
  refundRequest?: {
    id: string;
    status: string;
  };
  cachedAt: number; // Timestamp
}

const CACHE_KEY = 'fibalgo_user_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours max cache age

// Get cached user data instantly
export function getCachedUser(): CachedUserData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedUserData;
    
    // Check if cache is too old
    if (Date.now() - data.cachedAt > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

// Save user data to cache
export function setCachedUser(userData: Omit<CachedUserData, 'cachedAt'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheData: CachedUserData = {
      ...userData,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    
    // Also set individual keys for backwards compatibility
    localStorage.setItem('cachedUserPlan', userData.plan);
    localStorage.setItem('cachedUserName', userData.name);
    localStorage.setItem('cachedUserRole', userData.role);
    if (userData.avatarUrl) {
      localStorage.setItem('cachedUserAvatar', userData.avatarUrl);
    }
    if (userData.id) {
      localStorage.setItem(`cachedUserData_${userData.id}`, JSON.stringify(userData));
    }
  } catch (error) {
    console.error('Failed to cache user data:', error);
  }
}

// Clear all user cache (on logout)
export function clearUserCache(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem('cachedUserPlan');
  localStorage.removeItem('cachedUserName');
  localStorage.removeItem('cachedUserRole');
  localStorage.removeItem('cachedUserAvatar');
  
  // Clear user-specific caches
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('cachedUserData_') || key.startsWith('isAdmin_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Fetch and cache user data from API
export async function fetchAndCacheUser(
  userId: string,
  email: string,
  options?: { refresh?: boolean }
): Promise<CachedUserData | null> {
  try {
    const encodedEmail = encodeURIComponent(email);
    const refreshParam = options?.refresh ? '&refresh=1' : '';
    const response = await fetch(`/api/user?userId=${userId}&email=${encodedEmail}${refreshParam}`);
    
    if (!response.ok) return null;
    
    const userData = await response.json();
    
    const normalizedBillingHistory = (userData.billingHistory || []).map((b: any) => {
      const paymentMethod = (b.paymentMethod || '').toString().toLowerCase();
      const invoiceId = (b.invoiceId || b.invoice_id || '').toString().toLowerCase();
      const planDesc = (b.planDescription || b.plan_description || '').toString().toLowerCase();
      const desc = (b.description || '').toString().toLowerCase();
      const isCopecart = paymentMethod.startsWith('copecart_') || paymentMethod === 'copecart' || invoiceId.startsWith('cope-') || planDesc.includes('copecart') || desc.includes('copecart');
      const isCard = paymentMethod === 'credit_card' || paymentMethod === 'card' || paymentMethod === 'polar' || paymentMethod === 'credit card';
      const normalizedStatus = b.status === 'completed' ? 'paid' : b.status;
      let resolvedPaymentMethod = 'crypto';
      if (isCopecart) {
        const copecartMethod = paymentMethod.replace('copecart_', '');
        if (['credit_card', 'paypal', 'sepa', 'sofort', 'invoice', 'test'].includes(copecartMethod)) {
          resolvedPaymentMethod = copecartMethod === 'test' ? 'credit_card' : copecartMethod;
        } else {
          resolvedPaymentMethod = 'credit_card';
        }
      } else if (isCard) {
        resolvedPaymentMethod = 'credit_card';
      }
      return {
        ...b,
        status: normalizedStatus,
        paymentMethod: resolvedPaymentMethod,
      };
    });

    const cacheData: Omit<CachedUserData, 'cachedAt'> = {
      id: userData.id,
      email: userData.email,
      name: userData.name || 'User',
      role: userData.role || 'user',
      avatarUrl: userData.avatarUrl || null,
      plan: userData.subscription?.plan || 'basic',
      tradingViewId: userData.tradingViewId || null,
      subscription: userData.subscription || {
        plan: 'basic',
        startDate: '',
        endDate: '',
        daysRemaining: -1,
        isActive: true,
        status: 'active',
      },
      billingHistory: normalizedBillingHistory,
      cancellationRequest: userData.cancellationRequest,
      refundRequest: userData.refundRequest,
    };
    
    setCachedUser(cacheData);
    return { ...cacheData, cachedAt: Date.now() };
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    return null;
  }
}
