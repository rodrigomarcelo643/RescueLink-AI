alter table fb_posts add column if not exists incident_tags text[] default '{}';
