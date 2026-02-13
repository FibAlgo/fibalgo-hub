// Production Store - Wraps Supabase DB with userStore-compatible interface
// This provides the same interface as the old in-memory store but uses real database

import * as db from '@/lib/db/supabaseDb';

// =============================================
// TYPES (Same as old userStore for compatibility)
// =============================================

export interface UserSubscription {
  plan: 'basic' | 'premium' | 'ultimate' | 'lifetime';
  startDate: string;
  endDate: string;
  daysRemaining: number; // -1 = unlimited (basic)
  isActive: boolean;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  tradingviewAccessGranted?: boolean;
}

export type PaymentMethod = 'crypto' | 'credit_card' | 'copecart' | 'paypal' | 'sepa' | 'sofort' | 'invoice';

export interface BillingRecord {
  id: string;
  realId?: string;
  date: string;
  amount: string;
  plan: string;
  invoiceNumber?: string;
  status: 'paid' | 'pending' | 'refunded' | 'cancelled';
  paymentMethod?: PaymentMethod;
  addedBy: string;
  polarOrderId?: string;
  invoiceUrl?: string;
  hasPendingRefund?: boolean;
  billingReason?: string | null;
}

export interface CancellationRequest {
  id: string;
  requestDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  processedDate?: string;
  processedBy?: string;
}

export interface RefundRequest {
  id: string;
  requestDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  processedDate?: string;
  processedBy?: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'billing' | 'technical' | 'cancellation' | 'other';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  profilePicture?: string;
  tradingViewId?: string;
  telegramId?: string;
  accountType?: 'google' | 'email'; // Account type - Google OAuth or Email signup
  emailVerified?: boolean; // Email verification status
  adminNote?: string;
  subscription: UserSubscription;
  billingHistory: BillingRecord[];
  cancellationRequest?: CancellationRequest;
  refundRequest?: RefundRequest;
}

// =============================================
// CONVERTERS (DB format -> App format)
// =============================================

function convertDbUserToAppUser(dbUser: db.UserWithSubscription): AppUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || 'User',
    role: dbUser.role,
    createdAt: dbUser.created_at?.split('T')[0] || '',
    tradingViewId: dbUser.trading_view_id || undefined,
    telegramId: dbUser.telegram_id || undefined,
    adminNote: (dbUser as any).admin_note || undefined,
    subscription: {
      plan: dbUser.subscription?.plan || 'basic',
      startDate: dbUser.subscription?.start_date?.split('T')[0] || '',
      endDate: dbUser.subscription?.end_date?.split('T')[0] || '',
      daysRemaining: dbUser.subscription?.days_remaining ?? -1,
      isActive: dbUser.subscription?.is_active ?? true,
      status: (dbUser.subscription?.status === 'cancelled' ? 'expired' : dbUser.subscription?.status) || 'active',
    },
    billingHistory: (dbUser.billing_history || []).map(b => ({
      id: b.invoice_id || b.id,
      date: b.created_at?.split('T')[0] || '',
      amount: `$${b.amount?.toFixed(2) || '0.00'}`,
      plan: b.plan_description || '',
      invoiceNumber: (b as any).invoice_number || undefined,
      status: b.status as 'paid' | 'pending',
      paymentMethod: b.payment_method as PaymentMethod | undefined,
      addedBy: b.added_by || 'System',
      polarOrderId: b.polar_order_id,
      invoiceUrl: b.invoice_url,
    })),
    cancellationRequest: dbUser.cancellation_request ? {
      id: dbUser.cancellation_request.id,
      requestDate: dbUser.cancellation_request.request_date?.split('T')[0] || '',
      reason: dbUser.cancellation_request.reason,
      status: dbUser.cancellation_request.status,
      processedDate: dbUser.cancellation_request.processed_date?.split('T')[0],
      processedBy: dbUser.cancellation_request.processed_by || undefined,
    } : undefined,
  };
}

function convertDbTicketToAppTicket(dbTicket: db.TicketWithMessages): SupportTicket {
  // Map priority - handle both old and new priority formats
  const priorityString = dbTicket.priority as string;
  const mappedPriority = priorityString === 'normal' ? 'medium' : 
                         priorityString === 'urgent' ? 'high' : 
                         (priorityString as 'low' | 'medium' | 'high');
  
  return {
    id: dbTicket.id,
    userId: dbTicket.userId,
    userName: dbTicket.userName,
    userEmail: dbTicket.userEmail,
    subject: dbTicket.subject,
    category: dbTicket.category,
    status: dbTicket.status,
    priority: mappedPriority,
    messages: (dbTicket.messages || []).map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      message: m.message,
      timestamp: m.timestamp,
    })),
    createdAt: dbTicket.createdAt,
    updatedAt: dbTicket.updatedAt,
  };
}

// =============================================
// USER FUNCTIONS
// =============================================

export async function getUser(userId: string): Promise<AppUser | undefined> {
  const user = await db.getUser(userId);
  return user ? convertDbUserToAppUser(user) : undefined;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const users = await db.getAllUsers();
  return users.map(convertDbUserToAppUser);
}

export async function getUsersByRole(role: 'admin' | 'user'): Promise<AppUser[]> {
  const users = await getAllUsers();
  return users.filter(u => u.role === role);
}

export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  const user = await db.getUserByEmail(email);
  return user ? convertDbUserToAppUser(user) : undefined;
}

export async function createUser(
  email: string,
  name: string,
  tradingViewId: string,
  telegramId?: string
): Promise<AppUser | undefined> {
  const user = await db.createUser({
    email,
    name,
    tradingViewId,
    telegramId: telegramId || undefined,
  });
  return user ? convertDbUserToAppUser(user) : undefined;
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<AppUser, 'name' | 'tradingViewId' | 'telegramId'>>
): Promise<boolean> {
  return db.updateUser(userId, {
    name: updates.name,
    trading_view_id: updates.tradingViewId,
    telegram_id: updates.telegramId,
  });
}

// =============================================
// SUBSCRIPTION FUNCTIONS
// =============================================

export async function addSubscription(
  userId: string,
  plan: 'basic' | 'premium' | 'ultimate',
  days: number,
  amount: string,
  adminEmail: string,
  paymentMethod?: PaymentMethod
): Promise<AppUser | undefined> {
  const success = await db.updateSubscription(
    userId,
    plan,
    days,
    amount,
    paymentMethod || 'crypto',
    adminEmail
  );
  
  if (!success) return undefined;
  return getUser(userId);
}

export async function extendSubscription(
  userId: string,
  additionalDays: number,
  amount: string,
  adminEmail: string,
  paymentMethod?: PaymentMethod
): Promise<AppUser | undefined> {
  const success = await db.extendSubscription(
    userId,
    additionalDays,
    amount,
    paymentMethod || 'crypto',
    adminEmail
  );
  
  if (!success) return undefined;
  return getUser(userId);
}

export async function downgradeToBasic(userId: string): Promise<AppUser | undefined> {
  const success = await db.downgradeToBasic(userId);
  if (!success) return undefined;
  return getUser(userId);
}

// =============================================
// CANCELLATION FUNCTIONS
// =============================================

export async function requestCancellation(userId: string, reason: string): Promise<AppUser | undefined> {
  const success = await db.requestCancellation(userId, reason);
  if (!success) return undefined;
  return getUser(userId);
}

export async function getPendingCancellations(): Promise<AppUser[]> {
  const cancellations = await db.getPendingCancellations();
  // Already returns full user data, just convert to AppUser format
  return cancellations.map(convertDbUserToAppUser);
}

export async function approveCancellation(userId: string, adminEmail: string): Promise<AppUser | undefined> {
  const success = await db.approveCancellation(userId, adminEmail);
  if (!success) return undefined;
  return getUser(userId);
}

export async function rejectCancellation(userId: string, adminEmail: string): Promise<AppUser | undefined> {
  const success = await db.rejectCancellation(userId, adminEmail);
  if (!success) return undefined;
  return getUser(userId);
}

// =============================================
// TICKET FUNCTIONS
// =============================================

export async function createTicket(
  userId: string,
  userName: string,
  userEmail: string,
  subject: string,
  message: string,
  category: SupportTicket['category'] = 'general',
  priority: SupportTicket['priority'] = 'medium'
): Promise<SupportTicket | undefined> {
  const ticket = await db.createTicket(userId, userName, userEmail, subject, message, category);
  return ticket ? convertDbTicketToAppTicket(ticket) : undefined;
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const tickets = await db.getAllTickets();
  return tickets.map(convertDbTicketToAppTicket);
}

export async function getTicketsByUser(userId: string): Promise<SupportTicket[]> {
  const tickets = await db.getTicketsByUser(userId);
  return tickets.map(convertDbTicketToAppTicket);
}

export async function getOpenTickets(): Promise<SupportTicket[]> {
  const tickets = await getAllTickets();
  return tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
}

export async function getTicketById(ticketId: string): Promise<SupportTicket | undefined> {
  const ticket = await db.getTicketById(ticketId);
  return ticket ? convertDbTicketToAppTicket(ticket) : undefined;
}

export async function addMessageToTicket(
  ticketId: string,
  senderId: string,
  senderName: string,
  senderRole: 'user' | 'admin',
  message: string
): Promise<SupportTicket | undefined> {
  const success = await db.addMessageToTicket(ticketId, senderId, senderName, senderRole, message);
  if (!success) return undefined;
  return getTicketById(ticketId);
}

export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicket['status'],
  closedBy?: string
): Promise<SupportTicket | undefined> {
  const success = await db.updateTicketStatus(ticketId, status);
  if (!success) return undefined;
  return getTicketById(ticketId);
}

export async function getTicketStats(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}> {
  const tickets = await getAllTickets();
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };
}

// =============================================
// STATS FUNCTION
// =============================================

export async function getStats() {
  return db.getStats();
}
