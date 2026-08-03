# 03 — Supabase

## Step 1: Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Set project name: `rescuelinkai`
3. Set a strong database password
4. Choose region closest to Philippines (Southeast Asia)

---

## Step 2: Database Schema

Run these migrations in order via Supabase SQL Editor or `supabase/migrations/`.

### profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('citizen', 'lgu', 'ngo', 'volunteer', 'admin')) default 'citizen',
  barangay text,
  municipality text,
  phone text,
  created_at timestamptz default now()
);
```

### rescue_tickets
```sql
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
```

### donations
```sql
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
```

### volunteers
```sql
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
```

### evacuation_centers
```sql
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
```

### public_advisories
```sql
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
```

---

## Step 3: Row Level Security (RLS)

Enable RLS on all tables, then add policies.

```sql
-- rescue_tickets: anyone can insert, only lgu/admin can update
alter table rescue_tickets enable row level security;

create policy "Anyone can report" on rescue_tickets
  for insert with check (true);

create policy "LGU can view all" on rescue_tickets
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('lgu', 'admin', 'ngo')
    )
  );

create policy "LGU can update" on rescue_tickets
  for update using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('lgu', 'admin')
    )
  );

-- donations: public insert, lgu/admin can view all
alter table donations enable row level security;

create policy "Anyone can donate" on donations
  for insert with check (true);

create policy "LGU can view donations" on donations
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('lgu', 'admin', 'ngo')
    )
  );

-- public_advisories: public read
alter table public_advisories enable row level security;

create policy "Public can read advisories" on public_advisories
  for select using (published_at is not null);
```

---

## Step 4: Auth

Supabase Auth handles LGU officer login.

- Enable **Email** provider in Auth → Providers
- Disable public signups (Auth → Settings → Disable signups)
- LGU accounts are created manually by admin via Supabase Dashboard or invite link

### Frontend auth flow
```ts
// services/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

```ts
// services/auth.service.ts
import { supabase } from './supabase'

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
```

---

## Step 5: Storage

Create a bucket for incident media uploads.

1. Supabase Dashboard → Storage → New Bucket
2. Name: `incident-media`
3. Public: **false** (signed URLs only)

```sql
-- Allow authenticated users to upload
create policy "Auth users can upload media" on storage.objects
  for insert with check (
    bucket_id = 'incident-media' and auth.role() = 'authenticated'
  );

-- Allow LGU to view
create policy "LGU can view media" on storage.objects
  for select using (
    bucket_id = 'incident-media' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('lgu', 'admin')
    )
  );
```

---

## Step 6: Realtime

Enable realtime on `rescue_tickets` for live dashboard updates.

```sql
alter publication supabase_realtime add table rescue_tickets;
```

```ts
// hooks/useRealtime.ts
import { useEffect } from 'react'
import { supabase } from '@/services/supabase'

export function useRealtime(onNewTicket: (ticket: unknown) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('rescue_tickets')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rescue_tickets',
      }, (payload) => onNewTicket(payload.new))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onNewTicket])
}
```

---

## Step 7: Database Triggers

Auto-update `updated_at` on rescue_tickets:

```sql
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
```
