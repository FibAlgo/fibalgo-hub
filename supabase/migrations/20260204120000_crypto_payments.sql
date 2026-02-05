-- Crypto payments table for on-chain receipts
create table if not exists public.crypto_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text,
  tx_hash text not null,
  proof_path text,
  created_at timestamptz not null default now(),
  status text not null default 'pending'
);

alter table public.crypto_payments enable row level security;

-- Allow logged-in users to insert their own proof
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crypto_payments_insert_self' AND tablename = 'crypto_payments') THEN
    create policy crypto_payments_insert_self
      on public.crypto_payments
      for insert
      with check (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to read their own submissions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crypto_payments_select_self' AND tablename = 'crypto_payments') THEN
    create policy crypto_payments_select_self
      on public.crypto_payments
      for select
      using (auth.uid() = user_id);
  END IF;
END $$;

-- Allow admins to read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crypto_payments_select_admin' AND tablename = 'crypto_payments') THEN
    create policy crypto_payments_select_admin
      on public.crypto_payments
      for select
      using (
        exists (
          select 1 from public.users u
          where u.id = auth.uid()
            and u.role in ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Allow admins to update status if needed
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'crypto_payments_update_admin' AND tablename = 'crypto_payments') THEN
    create policy crypto_payments_update_admin
      on public.crypto_payments
      for update
      using (
        exists (
          select 1 from public.users u
          where u.id = auth.uid()
            and u.role in ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

