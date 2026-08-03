import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async () => {
  // 1. Get all conversations on the page
  const convRes = await fetch(
    `https://graph.facebook.com/v19.0/me/conversations?fields=participants,messages{message,from,created_time}&access_token=${FB_PAGE_ACCESS_TOKEN}`
  )
  const convData = await convRes.json()

  if (convData.error) {
    return new Response(JSON.stringify(convData.error), { status: 400 })
  }

  let inserted = 0

  for (const convo of convData.data ?? []) {
    // Find the non-page participant (the citizen)
    const citizen = convo.participants?.data?.find(
      (p: { id: string }) => p.id !== Deno.env.get('FB_PAGE_ID')
    )
    if (!citizen) continue

    const senderId: string = citizen.id

    for (const msg of convo.messages?.data ?? []) {
      const isPage = msg.from?.id === Deno.env.get('FB_PAGE_ID')
      const senderType = isPage ? 'lgu' : 'citizen'
      const createdAt = new Date(msg.created_time).toISOString()

      // Upsert — skip if already exists (idempotent)
      const { error } = await supabase.from('messenger_threads').insert({
        sender_id: senderId,
        sender_type: senderType,
        text: msg.message || '[attachment]',
        created_at: createdAt,
      })

      if (!error) inserted++
    }
  }

  return new Response(JSON.stringify({ ok: true, inserted }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
