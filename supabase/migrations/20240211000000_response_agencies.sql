create type agency_category as enum ('fire', 'police', 'medical', 'rescue', 'military', 'ngo', 'other');

create table if not exists response_agencies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         agency_category not null default 'rescue',
  contact_number   text,
  email            text,
  address          text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table response_agencies enable row level security;

create policy "LGU can manage response agencies"
  on response_agencies for all
  using (true)
  with check (true);
