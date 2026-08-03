-- ============================================================
-- RescueLink AI — Initial Schema Migration
-- ============================================================

-- profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('citizen', 'lgu', 'ngo', 'volunteer', 'admin')) default 'citizen',
  barangay text,
  municipality text,
  phone text,
  created_at timestamptz default now()
);

-- evacuation_centers (must exist before donations FK)
create table evacuation_centers (
  id uuid primary key default gen_random_uuid(),
  name text,
  barangay text,
  municipality text,
  latitude float,
  longitude float,
  capacity int,
  current_occupancy int default 0,
  needs jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- rescue_tickets
create table rescue_tickets (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  channel text check (channel in ('messenger', 'telegram', 'whatsapp', 'web')),
  disaster_type text,
  location_text text,
  latitude float,
  longitude float,
  people_affected int,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  status text check (status in ('pending', 'responding', 'rescued', 'closed')) default 'pending',
  priority_score int default 0,
  assigned_responder_id uuid references profiles(id),
  raw_message text,
  media_urls text[],
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- donations
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references profiles(id),
  type text check (type in ('monetary', 'in_kind')),
  amount numeric,
  currency text default 'PHP',
  items jsonb,
  payment_method text,
  payment_reference text,
  status text check (status in ('pending', 'confirmed', 'distributed')) default 'pending',
  allocated_to uuid references evacuation_centers(id),
  receipt_url text,
  created_at timestamptz default now()
);

-- volunteers
create table volunteers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  skills text[],
  equipment text[],
  latitude float,
  longitude float,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- public_advisories
create table public_advisories (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references rescue_tickets(id),
  title text,
  body text,
  type text check (type in ('flood_warning', 'road_closure', 'evacuation_open', 'donation_drive', 'relief_update')),
  confidence_score float,
  approved_by uuid references profiles(id),
  fb_post_id text,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table rescue_tickets enable row level security;
alter table donations enable row level security;
alter table public_advisories enable row level security;
alter table profiles enable row level security;
alter table volunteers enable row level security;
alter table evacuation_centers enable row level security;

-- rescue_tickets
create policy "Anyone can report" on rescue_tickets
  for insert with check (true);

create policy "LGU can view all" on rescue_tickets
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin', 'ngo'))
  );

create policy "LGU can update" on rescue_tickets
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

-- donations
create policy "Anyone can donate" on donations
  for insert with check (true);

create policy "LGU can view donations" on donations
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin', 'ngo'))
  );

-- public_advisories
create policy "Public can read advisories" on public_advisories
  for select using (published_at is not null);

create policy "LGU can manage advisories" on public_advisories
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

-- profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Trigger can insert profile" on profiles
  for insert with check (true);

-- volunteers
create policy "LGU can view volunteers" on volunteers
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin', 'ngo'))
  );

create policy "Volunteers can update own record" on volunteers
  for update using (
    exists (select 1 from profiles where id = auth.uid() and id = profile_id)
  );

-- evacuation_centers
create policy "Public can view active centers" on evacuation_centers
  for select using (is_active = true);

-- ============================================================
-- Storage Policies
-- ============================================================

create policy "Auth users can upload media" on storage.objects
  for insert with check (
    bucket_id = 'incident-media' and auth.role() = 'authenticated'
  );

create policy "LGU can view media" on storage.objects
  for select using (
    bucket_id = 'incident-media' and
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table rescue_tickets;

-- ============================================================
-- Triggers
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on rescue_tickets
  for each row execute function update_updated_at();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
