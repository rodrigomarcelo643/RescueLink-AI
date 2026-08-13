-- ============================================================
-- RescueLink AI — Enable DELETE Policy on rescue_tickets
-- ============================================================

-- Drop existing delete policies if any
drop policy if exists "LGU can delete" on rescue_tickets;
drop policy if exists "Anyone can delete rescue_tickets" on rescue_tickets;

-- Create DELETE policy for rescue_tickets
create policy "Anyone can delete rescue_tickets" on rescue_tickets
  for delete using (true);
