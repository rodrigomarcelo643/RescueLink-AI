import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const FB_VERIFY_TOKEN = Deno.env.get('FB_VERIFY_TOKEN')!
const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  // Webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()

  // LGU reply passthrough
  if (body._lgu_reply) {
    const result = await sendMessage(body.recipient_id, body.text)
    if (!result.ok) {
      const err = await result.json()
      console.error('FB send error:', JSON.stringify(err))
      return new Response(JSON.stringify(err), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    await supabase.from('messenger_threads').insert({
      sender_id: body.recipient_id,
      sender_type: 'lgu',
      text: body.text,
    })
    return new Response('OK', { status: 200, headers: corsHeaders })
  }

  for (const entry of body.entry ?? []) {
    // ── Messenger DMs ──
    for (const messaging of entry.messaging ?? []) {
      if (!messaging.message) continue
      const senderId = messaging.sender.id
      const text = messaging.message.text ?? ''
      const attachments = messaging.message.attachments ?? []
      const mediaUrls = attachments.map((a: { payload?: { url?: string } }) => a.payload?.url).filter(Boolean)

      // Store in rescue_tickets directly (no AI)
      const { data: ticket } = await supabase
        .from('rescue_tickets')
        .insert({
          channel: 'messenger',
          fb_sender_id: senderId,
          raw_message: text,
          media_urls: mediaUrls,
          severity: 'medium',
          status: 'pending',
          disaster_type: 'unclassified',
          priority_score: 50,
          location_text: null,
          ai_summary: null,
        })
        .select('id')
        .single()

      // Store in messenger_threads
      await supabase.from('messenger_threads').insert({
        sender_id: senderId,
        sender_type: 'citizen',
        text: text || '[attachment]',
      })

      if (ticket) {
        await sendMessage(senderId, `✅ Report received! Ticket #${ticket.id} created. We will respond shortly.`)
      }
    }

    // ── Page feed posts/comments ──
    for (const change of entry.changes ?? []) {
      if (change.field !== 'feed') continue
      const val = change.value
      if (val.item !== 'post' && val.item !== 'comment') continue
      if (val.verb !== 'add') continue

      await supabase.from('fb_posts').insert({
        post_id: val.post_id ?? val.comment_id ?? `${Date.now()}`,
        fb_sender_id: val.sender_id ?? null,
        page_name: 'RescueLink AI',
        message: val.message ?? '',
        permalink: `https://www.facebook.com/${val.post_id ?? ''}`,
        posted_at: new Date(val.created_time * 1000).toISOString(),
        ai_flagged: false,
        converted_to_ticket: false,
      })
    }
  }

  return new Response('OK', { status: 200 })
})

async function sendMessage(recipientId: string, text: string) {
  return fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  })
}
