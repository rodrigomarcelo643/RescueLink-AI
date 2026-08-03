import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  const { ticketId } = await req.json()

  const { data: ticket } = await supabase
    .from('rescue_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  const { data: volunteers } = await supabase
    .from('volunteers')
    .select('*, profiles(*)')
    .eq('is_available', true)

  const ranked = volunteers
    ?.map((v) => ({ ...v, distance: haversine(ticket.latitude, ticket.longitude, v.latitude, v.longitude) }))
    .sort((a, b) => a.distance - b.distance)

  const best = ranked?.[0] ?? null

  if (best) {
    await supabase
      .from('rescue_tickets')
      .update({ assigned_responder_id: best.profile_id, status: 'responding' })
      .eq('id', ticketId)
  }

  return new Response(JSON.stringify(best), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
