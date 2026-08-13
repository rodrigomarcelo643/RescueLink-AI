-- Add missing columns to response_agencies table

ALTER TABLE response_agencies
  ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'available'
    CHECK (operational_status IN ('available', 'busy', 'offline')),
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS equipment_notes TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS category_other_specify TEXT,
  ADD COLUMN IF NOT EXISTS current_assigned_ticket_id UUID REFERENCES rescue_tickets(id) ON DELETE SET NULL;

-- Index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_response_agencies_operational_status
  ON response_agencies (operational_status);

-- Index for username login lookups
CREATE INDEX IF NOT EXISTS idx_response_agencies_username
  ON response_agencies (username);
