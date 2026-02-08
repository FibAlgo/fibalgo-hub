// Simple in-memory store for demo purposes
// In production, use Supabase/Database

export interface UserSubscription {
  plan: 'basic' | 'premium' | 'ultimate' | 'lifetime';
  startDate: string;
  endDate: string;
  daysRemaining: number; // -1 = unlimited (basic)
  isActive: boolean;
  status: 'active' | 'expired' | 'pending';
}

export type PaymentMethod = 'crypto' | 'credit_card' | 'copecart' | 'paypal' | 'sepa' | 'sofort' | 'invoice';

export interface BillingRecord {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'paid' | 'pending';
  paymentMethod?: PaymentMethod;
  addedBy: string; // admin email
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

// Global tickets storage
export const ticketsDB: Map<string, SupportTicket> = new Map();

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  profilePicture?: string;
  tradingViewId?: string;
  telegramId?: string;
  adminNote?: string;
  subscription: UserSubscription;
  billingHistory: BillingRecord[];
  cancellationRequest?: CancellationRequest;
  refundRequest?: RefundRequest;
}

// Demo users database
export const usersDB: Map<string, AppUser> = new Map([
  ['admin', {
    id: 'admin',
    email: 'admin@fibalgo.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2025-01-01',
    subscription: {
      plan: 'ultimate',
      startDate: '2025-01-01',
      endDate: '',
      daysRemaining: -1, // -1 = unlimited (admin)
      isActive: true,
      status: 'active',
    },
    billingHistory: [],
  }],
  ['test', {
    id: 'test',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: '2026-01-10',
    tradingViewId: 'testuser_tv',
    telegramId: '@testuser_tg',
    subscription: {
      plan: 'basic',
      startDate: '2026-01-10',
      endDate: '',
      daysRemaining: -1, // -1 = unlimited/no expiry (basic)
      isActive: true,
      status: 'active',
    },
    billingHistory: [],
  }],
]);

// Helper functions
export function getUser(userId: string): AppUser | undefined {
  return usersDB.get(userId);
}

export function getAllUsers(): AppUser[] {
  return Array.from(usersDB.values());
}

export function getUsersByRole(role: 'admin' | 'user'): AppUser[] {
  return getAllUsers().filter(user => user.role === role);
}

export function updateUser(userId: string, updates: Partial<AppUser>): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user) return undefined;
  
  const updatedUser = { ...user, ...updates };
  usersDB.set(userId, updatedUser);
  return updatedUser;
}

export function addSubscription(
  userId: string, 
  plan: 'basic' | 'premium' | 'ultimate',
  days: number,
  amount: string,
  adminEmail: string,
  paymentMethod?: PaymentMethod
): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user) return undefined;

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Update subscription
  user.subscription = {
    plan,
    startDate,
    endDate,
    daysRemaining: days,
    isActive: true,
    status: 'active',
  };

  // Add billing record
  const billingRecord: BillingRecord = {
    id: `INV-${new Date().getFullYear()}-${String(user.billingHistory.length + 1).padStart(3, '0')}`,
    date: startDate,
    amount,
    plan: `${plan.charAt(0).toUpperCase() + plan.slice(1)} - ${days} Days`,
    status: 'paid',
    paymentMethod,
    addedBy: adminEmail,
  };

  user.billingHistory.unshift(billingRecord);
  usersDB.set(userId, user);
  
  return user;
}

export function extendSubscription(
  userId: string,
  additionalDays: number,
  amount: string,
  adminEmail: string,
  paymentMethod?: PaymentMethod
): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user) return undefined;

  // Calculate new end date
  const currentEndDate = user.subscription.endDate ? new Date(user.subscription.endDate) : new Date();
  const newEndDate = new Date(currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
  
  user.subscription.endDate = newEndDate.toISOString().split('T')[0];
  user.subscription.daysRemaining = user.subscription.daysRemaining === -1 ? additionalDays : user.subscription.daysRemaining + additionalDays;
  user.subscription.isActive = true;

  // Add billing record
  const billingRecord: BillingRecord = {
    id: `INV-${new Date().getFullYear()}-${String(user.billingHistory.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    amount,
    plan: `${user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1)} Extension - ${additionalDays} Days`,
    status: 'paid',
    paymentMethod,
    addedBy: adminEmail,
  };

  user.billingHistory.unshift(billingRecord);
  usersDB.set(userId, user);
  
  return user;
}

export function createUser(
  email: string, 
  name: string, 
  tradingViewId: string, 
  telegramId?: string
): AppUser {
  const id = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const newUser: AppUser = {
    id,
    email,
    name,
    role: 'user',
    createdAt: new Date().toISOString().split('T')[0],
    tradingViewId,
    telegramId: telegramId || '',
    subscription: {
      plan: 'basic', // Users start with unlimited basic
      startDate: new Date().toISOString().split('T')[0],
      endDate: '', // No end date for basic
      daysRemaining: -1, // -1 = unlimited (basic tier)
      isActive: true,
      status: 'active',
    },
    billingHistory: [],
  };

  usersDB.set(id, newUser);
  return newUser;
}

// Downgrade user to basic (when payment is not received)
export function downgradeToBasic(userId: string, adminEmail: string): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user) return undefined;

  // Save old plan for record
  const oldPlan = user.subscription.plan;

  // Downgrade to basic
  user.subscription = {
    plan: 'basic',
    startDate: user.subscription.startDate,
    endDate: '',
    daysRemaining: -1, // unlimited basic
    isActive: true,
    status: 'active',
  };

  // Add record
  const billingRecord: BillingRecord = {
    id: `DWN-${new Date().getFullYear()}-${String(user.billingHistory.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    amount: '$0.00',
    plan: `Downgraded from ${oldPlan.toUpperCase()} to BASIC (Payment not received)`,
    status: 'pending',
    addedBy: adminEmail,
  };

  user.billingHistory.unshift(billingRecord);
  usersDB.set(userId, user);
  
  return user;
}

export function findUserByEmail(email: string): AppUser | undefined {
  return getAllUsers().find(user => user.email.toLowerCase() === email.toLowerCase());
}

// Request cancellation (user action)
export function requestCancellation(userId: string, reason: string): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user) return undefined;

  user.cancellationRequest = {
    id: `CAN-${new Date().getFullYear()}-${Date.now()}`,
    requestDate: new Date().toISOString().split('T')[0],
    reason,
    status: 'pending',
  };

  usersDB.set(userId, user);
  return user;
}

// Get users with pending cancellation requests
export function getPendingCancellations(): AppUser[] {
  return getAllUsers().filter(user => 
    user.cancellationRequest && user.cancellationRequest.status === 'pending'
  );
}

// Approve cancellation (admin action)
export function approveCancellation(userId: string, adminEmail: string): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user || !user.cancellationRequest) return undefined;

  // Update cancellation request
  user.cancellationRequest.status = 'approved';
  user.cancellationRequest.processedDate = new Date().toISOString().split('T')[0];
  user.cancellationRequest.processedBy = adminEmail;

  // Downgrade to basic
  const oldPlan = user.subscription.plan;
  user.subscription = {
    plan: 'basic',
    startDate: user.subscription.startDate,
    endDate: '',
    daysRemaining: -1,
    isActive: true,
    status: 'active',
  };

  // Add billing record
  const billingRecord: BillingRecord = {
    id: `CAN-${new Date().getFullYear()}-${String(user.billingHistory.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    amount: '$0.00',
    plan: `Cancelled ${oldPlan.toUpperCase()} → BASIC (User Request)`,
    status: 'pending',
    addedBy: adminEmail,
  };

  user.billingHistory.unshift(billingRecord);
  usersDB.set(userId, user);
  return user;
}

// Reject cancellation (admin action)
export function rejectCancellation(userId: string, adminEmail: string): AppUser | undefined {
  const user = usersDB.get(userId);
  if (!user || !user.cancellationRequest) return undefined;

  user.cancellationRequest.status = 'rejected';
  user.cancellationRequest.processedDate = new Date().toISOString().split('T')[0];
  user.cancellationRequest.processedBy = adminEmail;

  usersDB.set(userId, user);
  return user;
}

// ============ SUPPORT TICKET FUNCTIONS ============

// Create a new support ticket
export function createTicket(
  userId: string,
  userName: string,
  userEmail: string,
  subject: string,
  message: string,
  category: SupportTicket['category'] = 'general',
  priority: SupportTicket['priority'] = 'medium'
): SupportTicket {
  const ticketId = `TKT-${Date.now()}`;
  const now = new Date().toISOString();

  const ticket: SupportTicket = {
    id: ticketId,
    userId,
    userName,
    userEmail,
    subject,
    category,
    status: 'open',
    priority,
    messages: [{
      id: `MSG-${Date.now()}`,
      senderId: userId,
      senderName: userName,
      senderRole: 'user',
      message,
      timestamp: now,
    }],
    createdAt: now,
    updatedAt: now,
  };

  ticketsDB.set(ticketId, ticket);
  return ticket;
}

// Get all tickets
export function getAllTickets(): SupportTicket[] {
  return Array.from(ticketsDB.values()).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

// Get tickets by user
export function getTicketsByUser(userId: string): SupportTicket[] {
  return getAllTickets().filter(t => t.userId === userId);
}

// Get open tickets (for admin)
export function getOpenTickets(): SupportTicket[] {
  return getAllTickets().filter(t => t.status === 'open' || t.status === 'in-progress');
}

// Get ticket by ID
export function getTicketById(ticketId: string): SupportTicket | undefined {
  return ticketsDB.get(ticketId);
}

// Add message to ticket
export function addMessageToTicket(
  ticketId: string,
  senderId: string,
  senderName: string,
  senderRole: 'user' | 'admin',
  message: string
): SupportTicket | undefined {
  const ticket = ticketsDB.get(ticketId);
  if (!ticket) return undefined;

  const newMessage: TicketMessage = {
    id: `MSG-${Date.now()}`,
    senderId,
    senderName,
    senderRole,
    message,
    timestamp: new Date().toISOString(),
  };

  ticket.messages.push(newMessage);
  ticket.updatedAt = new Date().toISOString();
  
  // If admin replies, set status to in-progress
  if (senderRole === 'admin' && ticket.status === 'open') {
    ticket.status = 'in-progress';
  }

  ticketsDB.set(ticketId, ticket);
  return ticket;
}

// Update ticket status
export function updateTicketStatus(
  ticketId: string,
  status: SupportTicket['status'],
  closedBy?: string
): SupportTicket | undefined {
  const ticket = ticketsDB.get(ticketId);
  if (!ticket) return undefined;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  
  if (status === 'closed' || status === 'resolved') {
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = closedBy;
  }

  ticketsDB.set(ticketId, ticket);
  return ticket;
}

// Get ticket counts by status
export function getTicketStats() {
  const tickets = getAllTickets();
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };
}
