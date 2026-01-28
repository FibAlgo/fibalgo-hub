-- FibAlgo Database Schema

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  trading_view_id TEXT,
  telegram_id TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'ultimate', 'lifetime')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'cancellation', 'other')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff_reply BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription purchase notifications (user informs admin of purchase)
CREATE TABLE IF NOT EXISTS public.subscription_purchase_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'ultimate', 'lifetime')),
  payment_method TEXT DEFAULT 'crypto' CHECK (payment_method IN ('crypto', 'credit_card', 'bank_transfer', 'other')),
  transaction_id TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  handled_at TIMESTAMPTZ,
  handled_by UUID REFERENCES public.users(id)
);

-- Refund requests (first purchase within 3 days)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id),
  feedback TEXT
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_purchase_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Policies for support tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies for ticket messages
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add messages to own tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Policies for subscription purchase notifications
CREATE POLICY "Users can create purchase notifications" ON public.subscription_purchase_notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own purchase notifications" ON public.subscription_purchase_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Policies for refund requests
CREATE POLICY "Users can create refund requests" ON public.refund_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own refund requests" ON public.refund_requests
  FOR SELECT USING (user_id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
