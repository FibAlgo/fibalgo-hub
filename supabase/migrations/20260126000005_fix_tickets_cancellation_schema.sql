-- =====================================================
-- FIX TICKETS & CANCELLATION SCHEMA MISMATCHES
-- =====================================================
-- This migration adds missing columns that the API code expects

-- 1. SUPPORT_TICKETS TABLE FIXES
-- Add user_name column (code uses this for display)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Add user_email column (code stores this for reference)
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. TICKET_MESSAGES TABLE FIXES
-- Add sender_id column (code uses this instead of user_id for messages)
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS sender_id UUID;

-- Add sender_name column (code stores sender display name)
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add sender_role column (code uses 'user', 'admin', 'system')
ALTER TABLE public.ticket_messages 
ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'user';

-- 3. CANCELLATION_REQUESTS TABLE FIXES
-- Add request_date column (code uses this for request timestamp)
ALTER TABLE public.cancellation_requests 
ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ DEFAULT NOW();

-- Add processed_date column (code uses processed_date, not processed_at)
ALTER TABLE public.cancellation_requests 
ADD COLUMN IF NOT EXISTS processed_date TIMESTAMPTZ;

-- Add admin_note column (code uses this for admin notes)
ALTER TABLE public.cancellation_requests 
ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_email ON public.support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_role ON public.ticket_messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_request_date ON public.cancellation_requests(request_date);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'support_tickets' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'ticket_messages' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'cancellation_requests' ORDER BY ordinal_position;
