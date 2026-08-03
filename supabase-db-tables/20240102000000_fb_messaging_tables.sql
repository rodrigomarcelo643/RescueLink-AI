-- ============================================================
-- RescueLink AI — FB Monitoring & Messaging Tables
-- ============================================================

-- fb_posts
create table fb_posts (
  id uuid primary key default gen_random_uuid(),
  post_id text unique not null,
  fb_sender_id text,
  page_name text,
  message text,
  permalink text,
  posted_at timestamptz,
  ai_flagged boolean default false,
  ai_summary text,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  converted_to_ticket boolean default false,
  ticket_id uuid references rescue_tickets(id) on delete set null,
  created_at timestamptz default now()
);

-- messenger_threads
create table messenger_threads (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  sender_type text check (sender_type in ('citizen', 'lgu')) not null,
  text text not null,
  created_at timestamptz default now()
);

-- widget_messages
create table widget_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  sender text check (sender in ('user', 'bot')) not null,
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table fb_posts enable row level security;
alter table messenger_threads enable row level security;
alter table widget_messages enable row level security;

-- fb_posts
create policy "LGU can view fb_posts" on fb_posts
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

create policy "Service role can insert fb_posts" on fb_posts
  for insert with check (true);

create policy "LGU can update fb_posts" on fb_posts
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

-- messenger_threads
create policy "LGU can view threads" on messenger_threads
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('lgu', 'admin'))
  );

create policy "Anyone can insert thread messages" on messenger_threads
  for insert with check (true);

-- widget_messages
create policy "Anyone can insert widget messages" on widget_messages
  for insert with check (true);

create policy "Session owner can view own messages" on widget_messages
  for select using (true);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_fb_posts_ai_flagged on fb_posts (ai_flagged) where ai_flagged = true;
create index idx_fb_posts_posted_at on fb_posts (posted_at desc);
create index idx_messenger_threads_sender_id on messenger_threads (sender_id);
create index idx_widget_messages_session_id on widget_messages (session_id);

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table messenger_threads;
alter publication supabase_realtime add table widget_messages;
