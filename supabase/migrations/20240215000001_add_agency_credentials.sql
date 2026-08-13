-- ============================================================
-- RescueLink AI — Add Credentials & Specification Columns
-- ============================================================

alter table response_agencies 
  add column if not exists username text,
  add column if not exists password text,
  add column if not exists category_other_specify text;
