import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!
const WA_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()
  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!message) return new Response('OK', { status: 200 })

  const from = message.from
  const text = message.text?.body ?? ''

  const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ text, attachments: [], channel: 'whatsapp', senderId: from }),
  })

  const ticket = await aiRes.json()
  await sendMessage(from, `✅ Report received! Ticket #${ticket.id} created. We will respond shortly.`)

  return new Response('OK', { status: 200 })
})

async function sendMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
