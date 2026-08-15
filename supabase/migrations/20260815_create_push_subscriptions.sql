-- Create push_subscriptions table for background closed-app Web Push alerts
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text,
  auth text,
  user_lat double precision,
  user_lng double precision,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Allow public insert/upsert for citizen device subscription registration
create policy "Allow public push subscription insert"
  on public.push_subscriptions for insert
  with check (true);

create policy "Allow public push subscription read"
  on public.push_subscriptions for select
  using (true);
