-- ============================================================
-- Public Web Reporting — extend rescue_tickets + rate limiting
-- ============================================================

-- Add reporter identity + IP columns to rescue_tickets
alter table rescue_tickets
  add column if not exists reporter_name    text,
  add column if not exists reporter_contact text,
  add column if not exists ip_address       text;

-- Add 'facebook' to channel check (drop + recreate constraint)
alter table rescue_tickets
  drop constraint if exists rescue_tickets_channel_check;

alter table rescue_tickets
  add constraint rescue_tickets_channel_check
  check (channel in ('messenger', 'telegram', 'whatsapp', 'web', 'facebook'));

-- Rate limiting table (keyed by IP)
create table if not exists incident_rate_limits (
  ip_address  text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_ip_time
  on incident_rate_limits (ip_address, submitted_at);

-- RLS: anyone can insert/select their own rate limit rows (no auth needed)
alter table incident_rate_limits enable row level security;

create policy "Anyone can insert rate limit"
  on incident_rate_limits for insert with check (true);

create policy "Anyone can read rate limit"
  on incident_rate_limits for select using (true);

-- Allow public (anon) to SELECT rescue_tickets for the public dashboard
-- (only non-sensitive fields — handled in query, but policy must allow it)
drop policy if exists "Public can view active incidents" on rescue_tickets;
create policy "Public can view active incidents" on rescue_tickets
  for select using (true);

-- ============================================================
-- Storage: incident-media bucket — allow anon uploads + public read
-- ============================================================

-- Create bucket (idempotent via DO block)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('incident-media', 'incident-media', true)
  on conflict (id) do update set public = true;
end $$;

-- Drop old restrictive policies if they exist
drop policy if exists "Auth users can upload media" on storage.objects;
drop policy if exists "LGU can view media" on storage.objects;

-- Anyone (including anon) can upload to incident-media
create policy "Public can upload incident media"
  on storage.objects for insert
  with check (bucket_id = 'incident-media');

-- Anyone can read incident-media (public bucket)
create policy "Public can read incident media"
  on storage.objects for select
  using (bucket_id = 'incident-media');

-- LGU/admin can delete media
create policy "LGU can delete incident media"
  on storage.objects for delete
  using (
    bucket_id = 'incident-media' and
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );
