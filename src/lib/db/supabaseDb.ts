// @ts-nocheck
// Supabase Database Service - Production Ready
// Updated to match actual database schema

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types matching actual database schema
export interface DbUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin' | 'super_admin';
  avatar_url?: string | null;
  trading_view_id?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan: 'basic' | 'premium' | 'ultimate' | 'lifetime';
  status: 'active' | 'expired' | 'pending' | 'cancelled' | 'suspended' | 'refunded';
  start_date: string | null;
  end_date: string | null;
  days_remaining: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBillingRecord {
  id: string;
  user_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  plan_description: string | null;
  payment_method: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'paid';
  added_by: string | null;
  created_at: string;
  polar_order_id?: string;
  invoice_url?: string;
}

export interface DbCancellationRequest {
  id: string;
  user_id: string;
  subscription_id: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  request_date: string;
  processed_date: string | null;
  processed_by: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface DbSupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface DbTicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// Combined types for frontend
export interface UserWithSubscription {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  trading_view_id?: string;
  telegram_id?: string;
  created_at: string;
  updated_at: string;
  subscription: {
    id: string;
    user_id: string;
    plan: 'basic' | 'premium' | 'ultimate';
    status: 'active' | 'expired' | 'pending' | 'cancelled';
    start_date: string;
    end_date: string | null;
    days_remaining: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  billing_history: {
    id: string;
    user_id: string;
    invoice_id: string;
    amount: number;
    currency: string;
    plan_description: string;
    payment_method: 'crypto' | 'credit_card' | 'polar' | null;
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    added_by: string | null;
    created_at: string;
    polar_order_id?: string;
    invoice_url?: string;
  }[];
  cancellation_request?: {
    id: string;
    user_id: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    request_date: string;
    processed_date: string | null;
    processed_by: string | null;
    admin_note: string | null;
    created_at: string;
  };
}

export interface TicketWithMessages {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'billing' | 'technical' | 'cancellation' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'admin';
    message: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}

// Database schema type for Supabase
interface Database {
  public: {
    Tables: {
      users: { Row: DbUser };
      subscriptions: { Row: DbSubscription };
      billing_history: { Row: DbBillingRecord };
      cancellation_requests: { Row: DbCancellationRequest };
      support_tickets: { Row: DbSupportTicket };
      ticket_messages: { Row: DbTicketMessage };
    };
  };
}

// Supabase Client (Singleton)
let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

// Admin client with service role
export function getSupabaseAdmin(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Helper functions
function calculateDaysRemaining(expiresAt: string | null, planName: string): number {
  if (!expiresAt) return -1;
  if (planName.toLowerCase() === 'basic') return -1;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function mapPlanName(planName: string): 'basic' | 'premium' | 'ultimate' | 'lifetime' {
  const name = planName.toLowerCase();
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('ultimate') || name.includes('pro')) return 'ultimate';
  if (name.includes('premium') || name.includes('hub')) return 'premium';
  return 'basic';
}

// =============================================
// USER FUNCTIONS
// =============================================

export async function getUser(userId: string): Promise<UserWithSubscription | null> {
  const supabase = getSupabase();
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (userError || !user) return null;
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  const { data: billingHistory } = await supabase
    .from('billing_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  const { data: cancellationRequest } = await supabase
    .from('cancellation_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1)
    .single();

  const planName = subscription?.plan_id || subscription?.plan || 'Basic';
  const daysRemaining = subscription?.days_remaining ?? calculateDaysRemaining(subscription?.expires_at || subscription?.end_date || null, planName);
  
  return {
    id: user.id,
    email: user.email,
    name: user.full_name || 'User',
    role: user.role === 'super_admin' ? 'admin' : user.role,
    trading_view_id: user.trading_view_id || undefined,
    telegram_id: user.telegram_id || undefined,
    created_at: user.created_at,
    updated_at: user.updated_at,
    subscription: {
      id: subscription?.id || '',
      user_id: userId,
      plan: mapPlanName(planName),
      status: subscription?.status === 'suspended' ? 'expired' : (subscription?.status || 'active'),
      start_date: subscription?.started_at || subscription?.start_date || user.created_at?.split('T')[0] || '',
      end_date: subscription?.expires_at || subscription?.end_date || null,
      days_remaining: daysRemaining,
      is_active: subscription?.is_active === true,
      created_at: subscription?.created_at || user.created_at,
      updated_at: subscription?.updated_at || user.updated_at,
    },
    billing_history: (billingHistory || []).map(b => ({
      id: b.id,
      user_id: b.user_id,
      invoice_id: b.invoice_id || b.id,
      amount: b.amount,
      currency: b.currency,
      plan_description: b.plan_description || '',
      payment_method: b.payment_method === 'credit_card' ? 'credit_card' : 'crypto',
      status: b.status === 'completed' ? 'paid' : b.status,
      added_by: b.added_by || null,
      created_at: b.created_at,
    })),
    cancellation_request: cancellationRequest ? {
      id: cancellationRequest.id,
      user_id: cancellationRequest.user_id,
      reason: cancellationRequest.reason,
      status: cancellationRequest.status,
      request_date: cancellationRequest.request_date,
      processed_date: cancellationRequest.processed_date,
      processed_by: cancellationRequest.processed_by,
      admin_note: cancellationRequest.admin_note,
      created_at: cancellationRequest.created_at,
    } : undefined,
  };
}

interface UserWithRelations extends DbUser {
  subscriptions: DbSubscription[] | null;
  billing_history: DbBillingRecord[] | null;
  cancellation_requests: DbCancellationRequest[] | null;
}

export async function getAllUsers(): Promise<UserWithSubscription[]> {
  const supabase = getSupabase();
  
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      subscriptions (*),
      billing_history (*),
      cancellation_requests (*)
    `)
    .order('created_at', { ascending: false });
    
  if (error || !users) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return (users as unknown as UserWithRelations[]).map(user => {
    const subscription = user.subscriptions?.[0];
    const planName = subscription?.plan_id || subscription?.plan || 'Basic';
    const daysRemaining = subscription?.days_remaining ?? calculateDaysRemaining(subscription?.expires_at || subscription?.end_date || null, planName);
    
    return {
      id: user.id,
      email: user.email,
      name: user.full_name || 'User',
      role: user.role === 'super_admin' ? 'admin' : user.role,
      trading_view_id: user.trading_view_id || undefined,
      telegram_id: undefined,
      created_at: user.created_at,
      updated_at: user.updated_at,
      subscription: {
        id: subscription?.id || '',
        user_id: user.id,
        plan: mapPlanName(planName),
        status: subscription?.status === 'suspended' ? 'expired' : (subscription?.status || 'active'),
        start_date: subscription?.started_at || subscription?.start_date || user.created_at?.split('T')[0] || '',
        end_date: subscription?.expires_at || subscription?.end_date || null,
        days_remaining: daysRemaining,
        is_active: subscription?.is_active === true,
        created_at: subscription?.created_at || user.created_at,
        updated_at: subscription?.updated_at || user.updated_at,
      },
      billing_history: (user.billing_history || []).map(b => ({
        id: b.id,
        user_id: b.user_id,
        invoice_id: b.invoice_id || b.id,
        amount: b.amount,
        currency: b.currency,
        plan_description: b.plan_description || '',
        payment_method: b.payment_method === 'credit_card' ? 'credit_card' : 'crypto',
        status: b.status === 'completed' ? 'paid' : b.status,
        added_by: b.added_by || null,
        created_at: b.created_at,
      })),
      cancellation_request: user.cancellation_requests?.find(c => c.status === 'pending') ? {
        id: user.cancellation_requests.find(c => c.status === 'pending')!.id,
        user_id: user.id,
        reason: user.cancellation_requests.find(c => c.status === 'pending')!.reason,
        status: 'pending' as const,
        request_date: user.cancellation_requests.find(c => c.status === 'pending')!.request_date,
        processed_date: null,
        processed_by: null,
        admin_note: null,
        created_at: user.cancellation_requests.find(c => c.status === 'pending')!.created_at,
      } : undefined,
    };
  });
}

export async function getUserByEmail(email: string): Promise<UserWithSubscription | null> {
  const supabase = getSupabase();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
    
  if (error || !user) return null;
  
  return getUser(user.id);
}

export async function createUser(data: {
  email: string;
  name: string;
  tradingViewId: string;
  telegramId?: string;
}): Promise<UserWithSubscription | null> {
  console.log('createUser called - Note: Users should be created through Supabase Auth');
  const existing = await getUserByEmail(data.email);
  if (existing) return existing;
  return null;
}

export async function updateUser(
  userId: string,
  updates: { name?: string; tradingViewId?: string; telegramId?: string; trading_view_id?: string; telegram_id?: string }
): Promise<boolean> {
  const supabase = getSupabase();
  
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.full_name = updates.name;
  if (updates.tradingViewId || updates.trading_view_id) dbUpdates.trading_view_id = updates.tradingViewId || updates.trading_view_id;
  // telegram_id is not stored in DB but we accept the parameter
  
  const { error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', userId);
    
  return !error;
}

// =============================================
// SUBSCRIPTION FUNCTIONS
// =============================================

// Alias for compatibility
export async function updateSubscription(
  userId: string,
  plan: 'basic' | 'premium' | 'ultimate',
  days: number,
  amount: string,
  paymentMethod: 'crypto' | 'credit_card',
  addedBy: string
): Promise<boolean> {
  return addSubscription(userId, plan as 'premium' | 'ultimate', days, amount, paymentMethod, addedBy);
}

export async function addSubscription(
  userId: string,
  plan: 'premium' | 'ultimate',
  days: number,
  amount: string,
  paymentMethod: 'crypto' | 'credit_card',
  addedBy: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const currency = amount.startsWith('€') ? 'EUR' : 'USD';
  
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  
  if (existingSub) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: plan,
        status: 'active',
        start_date: now.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0] || null,
        days_remaining: days,
        is_active: true,
      })
      .eq('id', existingSub.id);
      
    if (error) return false;
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: plan,
        status: 'active',
        start_date: now.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0] || null,
        days_remaining: days,
        is_active: true,
      });
      
    if (error) return false;
  }
  
  await supabase
    .from('billing_history')
    .insert({
      user_id: userId,
      invoice_id: `INV-${Date.now()}`,
      amount: numericAmount,
      currency: currency,
      plan_description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${days} days`,
      payment_method: paymentMethod,
      status: 'completed',
      added_by: addedBy,
    });
  
  return true;
}

export async function extendSubscription(
  userId: string,
  days: number,
  amount: string,
  paymentMethod: 'crypto' | 'credit_card',
  addedBy: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single();
    
  if (!subscription) return false;
  
  const currentEnd = subscription.end_date ? new Date(subscription.end_date) : new Date();
  const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);
  const newDaysRemaining = Math.ceil((newEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const currency = amount.startsWith('€') ? 'EUR' : 'USD';
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      end_date: newEnd.toISOString().split('T')[0],
      days_remaining: newDaysRemaining,
      status: 'active',
      is_active: true,
    })
    .eq('id', subscription.id);
    
  if (error) return false;
  
  await supabase
    .from('billing_history')
    .insert({
      user_id: userId,
      invoice_id: `INV-${Date.now()}`,
      amount: numericAmount,
      currency: currency,
      plan_description: `Subscription Extension - ${days} days`,
      payment_method: paymentMethod,
      status: 'completed',
      added_by: addedBy,
    });
  
  return true;
}

export async function downgradeToBasic(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'basic',
      status: 'active',
      end_date: null,
      days_remaining: -1,
      is_active: true,
    })
    .eq('user_id', userId);
    
  return !error;
}

// =============================================
// CANCELLATION FUNCTIONS
// =============================================

export async function requestCancellation(userId: string, reason: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('cancellation_requests')
    .insert({
      user_id: userId,
      reason: reason,
      status: 'pending',
      request_date: new Date().toISOString(),
    });
    
  return !error;
}

export async function getPendingCancellations(): Promise<UserWithSubscription[]> {
  const supabase = getSupabase();
  
  const { data: requests, error } = await supabase
    .from('cancellation_requests')
    .select('user_id')
    .eq('status', 'pending');
    
  if (error || !requests) return [];
  
  const users: UserWithSubscription[] = [];
  for (const req of requests) {
    const user = await getUser(req.user_id);
    if (user) users.push(user);
  }
  
  return users;
}

export async function approveCancellation(userId: string, adminId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error: reqError } = await supabase
    .from('cancellation_requests')
    .update({
      status: 'approved',
      processed_date: new Date().toISOString(),
      processed_by: adminId,
    })
    .eq('user_id', userId)
    .eq('status', 'pending');
    
  if (reqError) return false;
  
  return downgradeToBasic(userId);
}

export async function rejectCancellation(userId: string, adminId: string, note?: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('cancellation_requests')
    .update({
      status: 'rejected',
      processed_date: new Date().toISOString(),
      processed_by: adminId,
      admin_note: note || null,
    })
    .eq('user_id', userId)
    .eq('status', 'pending');
    
  return !error;
}

// =============================================
// SUPPORT TICKET FUNCTIONS
// =============================================

export async function createTicket(
  userId: string,
  userName: string,
  userEmail: string,
  subject: string,
  message: string,
  category: 'general' | 'billing' | 'technical' | 'cancellation' | 'other'
): Promise<TicketWithMessages | null> {
  const supabase = getSupabase();
  
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      subject: subject,
      category: category,
      status: 'open',
    })
    .select()
    .single();
    
  if (ticketError || !ticket) return null;
  
  await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      user_id: userId,
      message: message,
      is_internal: false,
    });
  
  return getTicket(ticket.id);
}

export async function getTicket(ticketId: string): Promise<TicketWithMessages | null> {
  return getTicketById(ticketId);
}

export async function getTicketById(ticketId: string): Promise<TicketWithMessages | null> {
  const supabase = getSupabase();
  
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();
    
  if (error || !ticket) return null;
  
  const { data: user } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', ticket.user_id)
    .single();
  
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  
  // Get sender info for each message
  const messagesWithSenders = await Promise.all((messages || []).map(async (m) => {
    const { data: sender } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', m.user_id)
      .single();
    
    return {
      id: m.id,
      senderId: m.user_id,
      senderName: sender?.full_name || 'User',
      senderRole: (sender?.role === 'admin' || sender?.role === 'super_admin' ? 'admin' : 'user') as 'user' | 'admin',
      message: m.message,
      timestamp: m.created_at,
    };
  }));
  
  return {
    id: ticket.id,
    userId: ticket.user_id,
    userName: user?.full_name || 'User',
    userEmail: user?.email || '',
    subject: ticket.subject,
    category: ticket.category as 'general' | 'billing' | 'technical' | 'cancellation' | 'other',
    status: ticket.status === 'in_progress' ? 'in-progress' : ticket.status as any,
    priority: ticket.priority === 'urgent' ? 'high' : (ticket.priority === 'normal' ? 'medium' : ticket.priority) as any,
    messages: messagesWithSenders,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    closedAt: ticket.closed_at || undefined,
  };
}

export async function getTicketsByUser(userId: string): Promise<TicketWithMessages[]> {
  const supabase = getSupabase();
  
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error || !tickets) return [];
  
  const result: TicketWithMessages[] = [];
  for (const t of tickets) {
    const ticket = await getTicket(t.id);
    if (ticket) result.push(ticket);
  }
  
  return result;
}

export async function getAllTickets(): Promise<TicketWithMessages[]> {
  const supabase = getSupabase();
  
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id')
    .order('created_at', { ascending: false });
    
  if (error || !tickets) return [];
  
  const result: TicketWithMessages[] = [];
  for (const t of tickets) {
    const ticket = await getTicket(t.id);
    if (ticket) result.push(ticket);
  }
  
  return result;
}

export async function getOpenTickets(): Promise<TicketWithMessages[]> {
  const supabase = getSupabase();
  
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false });
    
  if (error || !tickets) return [];
  
  const result: TicketWithMessages[] = [];
  for (const t of tickets) {
    const ticket = await getTicket(t.id);
    if (ticket) result.push(ticket);
  }
  
  return result;
}

export async function addMessageToTicket(
  ticketId: string,
  senderId: string,
  senderName: string,
  senderRole: 'user' | 'admin',
  message: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      user_id: senderId,
      message: message,
      is_internal: false,
    });
    
  if (error) return false;
  
  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);
    
  return true;
}

export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in-progress' | 'resolved' | 'closed',
  closedBy?: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const dbStatus = status === 'in-progress' ? 'in_progress' : status;
  
  const updates: any = {
    status: dbStatus,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'closed' || status === 'resolved') {
    updates.closed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);
    
  return !error;
}

export async function getTicketStats() {
  const supabase = getSupabase();
  
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('status');
    
  const all = tickets || [];
  
  return {
    total: all.length,
    open: all.filter(t => t.status === 'open').length,
    inProgress: all.filter(t => t.status === 'in_progress').length,
    resolved: all.filter(t => t.status === 'resolved').length,
    closed: all.filter(t => t.status === 'closed').length,
  };
}

// =============================================
// GENERAL STATS (for Admin Dashboard)
// =============================================

export async function getStats() {
  const supabase = getSupabase();
  
  // Get all users
  const { data: users } = await supabase
    .from('users')
    .select('id, role, created_at');
    
  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('status, plan');
    
  // Get pending cancellations
  const { data: cancellations } = await supabase
    .from('cancellation_requests')
    .select('status')
    .eq('status', 'pending');
    
  // Get open tickets
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('status')
    .in('status', ['open', 'in_progress']);
  
  const allUsers = users || [];
  const allSubs = subscriptions || [];
  
  return {
    totalUsers: allUsers.length,
    activeSubscriptions: allSubs.filter(s => s.status === 'active').length,
    pendingCancellations: (cancellations || []).length,
    openTickets: (tickets || []).length,
    // Plan breakdown
    ultimateUsers: allSubs.filter(s => s.plan?.toLowerCase().includes('ultimate')).length,
    premiumUsers: allSubs.filter(s => s.plan?.toLowerCase().includes('premium')).length,
    basicUsers: allSubs.filter(s => s.plan?.toLowerCase().includes('basic') || !s.plan).length,
  };
}
