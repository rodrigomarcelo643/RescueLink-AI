-- Migration: Create lgu_settings table for persisting LGU Office Address, Hotline, Name, and Facebook URL
create table if not exists public.lgu_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  lgu_name text,
  emergency_hotline text,
  office_address text,
  facebook_page_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.lgu_settings enable row level security;

-- Policies for LGU settings
create policy "Allow user to select own lgu_settings"
  on public.lgu_settings for select
  using (auth.uid() = user_id);

create policy "Allow user to insert own lgu_settings"
  on public.lgu_settings for insert
  with check (auth.uid() = user_id);

create policy "Allow user to update own lgu_settings"
  on public.lgu_settings for update
  using (auth.uid() = user_id);
