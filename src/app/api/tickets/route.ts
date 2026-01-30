import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus, sanitizeDbError } from '@/lib/api/auth';

// Use service role for operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET - Get all tickets or tickets for a specific user
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify user is authenticated
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';

    // 🔒 SECURITY: Non-admin users can only access their own tickets
    let effectiveUserId = userId;
    if (!isAdmin) {
      // Force non-admin users to only see their own tickets
      effectiveUserId = authUser.id;
    }

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (effectiveUserId) {
      query = query.eq('user_id', effectiveUserId);
    }

    if (status && status !== 'all') {
      if (status === 'open') {
        query = query.in('status', ['open', 'in_progress']);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'tickets-fetch') }, { status: 500 });
    }

    // Get messages for each ticket
    const ticketsWithMessages = await Promise.all((tickets || []).map(async (ticket: any) => {
      const { data: messages } = await supabaseAdmin
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      // Map messages using actual column names
      const mappedMessages = await Promise.all((messages || []).map(async (m: any) => {
        const isAutoMessage = m.message?.startsWith('[SYSTEM]');
        let attachmentUrl: string | null = m.attachment_url || null;

        if (attachmentUrl) {
          let attachmentPath: string | null = null;

          if (attachmentUrl.startsWith('http')) {
            const marker = '/storage/v1/object/public/ticket-attachments/';
            if (attachmentUrl.includes(marker)) {
              attachmentPath = attachmentUrl.split(marker)[1]?.split('?')[0] || null;
            }
          } else {
            attachmentPath = attachmentUrl;
          }

          if (attachmentPath) {
            const { data } = await supabaseAdmin.storage
              .from('ticket-attachments')
              .createSignedUrl(attachmentPath, 3600);
            attachmentUrl = data?.signedUrl || attachmentUrl;
          }
        }

        return {
          id: m.id,
          senderId: m.sender_id,
          senderName: (m.sender_role === 'admin' || m.sender_role === 'system') ? 'FibAlgo - Support' : (m.sender_name || 'User'),
          senderRole: m.sender_role || 'user',
          isStaffReply: m.sender_role === 'admin' || m.sender_role === 'system',
          isSystemMessage: m.sender_role === 'system' || isAutoMessage, // Auto messages don't count for admin unread
          message: m.message,
          attachmentUrl: attachmentUrl || null,
          timestamp: m.created_at,
        };
      }));

      // Calculate unread counts
      // System messages count as staff reply for user, but don't affect admin unread
      let unreadForUser = 0;
      let unreadForAdmin = 0;
      
      // Count consecutive staff/system messages from the end for user's unread
      for (let i = mappedMessages.length - 1; i >= 0; i--) {
        if (mappedMessages[i].isStaffReply) {
          unreadForUser++;
        } else {
          break;
        }
      }
      
      // Count consecutive user messages from the end for admin's unread
      // Skip system messages - they don't count as "read" by admin
      for (let i = mappedMessages.length - 1; i >= 0; i--) {
        if (mappedMessages[i].isSystemMessage) {
          // Skip system messages - continue counting
          continue;
        }
        if (!mappedMessages[i].isStaffReply) {
          unreadForAdmin++;
        } else {
          break;
        }
      }

      return {
        id: ticket.id,
        userId: ticket.user_id,
        userName: ticket.user_name || 'User',
        userEmail: ticket.user_email || '',
        subject: ticket.subject,
        category: ticket.category || 'general',
        status: ticket.status === 'in_progress' ? 'in-progress' : ticket.status,
        priority: ticket.priority === 'urgent' ? 'high' : (ticket.priority === 'normal' ? 'medium' : ticket.priority),
        messages: mappedMessages,
        unreadForUser,
        unreadForAdmin,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
      };
    }));

    return NextResponse.json(ticketsWithMessages);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new ticket (user side)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subject, message, category, priority, attachmentUrl, attachmentPath } = body;

    if (!userId || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify user can only create tickets for themselves
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }
    
    // Users can only create tickets for themselves (admins can create for any user)
    const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
    if (!isAdmin && authUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user info
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('name, full_name, email')
      .eq('id', userId)
      .single();

    const userName = userData?.full_name || userData?.name || userData?.email || 'User';
    const userEmail = userData?.email || '';

    // Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        subject: subject,
        category: category || 'general',
        status: 'open',
        priority: priority || 'normal',
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError);
      return NextResponse.json({ error: ticketError?.message || 'Failed to create ticket' }, { status: 500 });
    }

    // Add first message using correct column names
    const { error: msgError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: userId,
        sender_name: userName,
        sender_role: 'user',
        message: message,
        attachment_url: attachmentPath || attachmentUrl || null,
      });

    if (msgError) {
      console.error('Error adding message:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Add automatic welcome message from FibAlgo Support
    // Using 'admin' role so it passes any database constraints
    // The message content makes it clear this is an automated response
    const welcomeResult = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: userId,
        sender_name: 'FibAlgo - Support',
        sender_role: 'admin', // Use admin role to pass constraints
        message: '[SYSTEM] Thank you for contacting FibAlgo Support! Our team will respond to your ticket as soon as possible. Please check back here for updates.',
        attachment_url: null,
      });

    if (welcomeResult.error) {
      console.error('Error adding welcome message:', welcomeResult.error);
      console.error('Welcome message error details:', JSON.stringify(welcomeResult.error));
    } else {
      console.log('Welcome message added successfully');
    }

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Add message to ticket or update status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, action, userId, message, status, attachmentUrl, attachmentPath, isAdmin: isAdminFromBody } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify user is authenticated
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // Get the ticket to verify ownership
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
    const isOwner = ticket.user_id === authUser.id;

    // 🔒 SECURITY: Users can only modify their own tickets, admins can modify any
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'addMessage') {
      // Allow sending with just attachment OR message (or both)
      if (!userId || (!message && !attachmentUrl)) {
        return NextResponse.json({ error: 'Missing userId or content (message or attachment required)' }, { status: 400 });
      }

      // Get user info - first try users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, full_name, email, role')
        .eq('id', userId)
        .single();
      
      // Check if admin - from database role OR from request body (for auth users not in users table)
      const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin' || isAdminFromBody === true;
      const senderName = isAdmin ? 'FibAlgo - Support' : (userData?.full_name || userData?.name || userData?.email || 'User');
      const senderRole = isAdmin ? 'admin' : 'user';

      // Add message using correct column names
      // If only attachment, use empty string for message
      const { error } = await supabaseAdmin
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: userId,
          sender_name: senderName,
          sender_role: senderRole,
          message: message || '',
          attachment_url: attachmentPath || attachmentUrl || null,
        });

      if (error) {
        console.error('Error adding message:', error);
        return NextResponse.json({ error: sanitizeDbError(error, 'tickets-message') }, { status: 500 });
      }

      // Update ticket timestamp
      await supabaseAdmin
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return NextResponse.json({ success: true });
    } else if (action === 'updateStatus') {
      if (!status) {
        return NextResponse.json({ error: 'Missing status' }, { status: 400 });
      }

      const dbStatus = status === 'in-progress' ? 'in_progress' : status;
      const updates: any = {
        status: dbStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket status:', error);
        return NextResponse.json({ error: sanitizeDbError(error, 'tickets-status') }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
