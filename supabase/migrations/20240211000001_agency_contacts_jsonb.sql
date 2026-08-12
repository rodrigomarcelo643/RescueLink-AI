alter table response_agencies
  drop column if exists contact_number,
  add column if not exists contacts jsonb not null default '[]'::jsonb;
