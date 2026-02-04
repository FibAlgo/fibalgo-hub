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
create policy crypto_payments_insert_self
  on public.crypto_payments
  for insert
  with check (auth.uid() = user_id);

-- Allow users to read their own submissions
create policy crypto_payments_select_self
  on public.crypto_payments
  for select
  using (auth.uid() = user_id);

-- Allow admins to read all
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

-- Allow admins to update status if needed
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
