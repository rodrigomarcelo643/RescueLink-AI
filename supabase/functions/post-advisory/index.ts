import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const FB_PAGE_ID = Deno.env.get('FB_PAGE_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const ADVISORY_EMOJI: Record<string, string> = {
  flood_warning: '🚨',
  road_closure: '⚠️',
  evacuation_open: '🏫',
  donation_drive: '❤️',
  relief_update: '📦',
}

serve(async (req) => {
  const { advisoryId } = await req.json()

  const { data: advisory } = await supabase
    .from('public_advisories')
    .select('*')
    .eq('id', advisoryId)
    .single()

  if (!advisory) return new Response('Not found', { status: 404 })

  const emoji = ADVISORY_EMOJI[advisory.type] ?? '📢'
  const post = `${emoji} ${advisory.title}\n\n${advisory.body}\n\n— RescueLink AI`

  const res = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: post, access_token: FB_PAGE_ACCESS_TOKEN }),
  })

  const result = await res.json()

  await supabase
    .from('public_advisories')
    .update({ fb_post_id: result.id, published_at: new Date().toISOString() })
    .eq('id', advisoryId)

  return new Response(JSON.stringify({ fbPostId: result.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
