import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const body = await req.json()
  const message = body.message
  if (!message) return new Response('OK', { status: 200 })

  const chatId = message.chat.id
  const text = message.text ?? ''
  const photo = message.photo ?? null

  const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ text, attachments: photo ? [photo] : [], channel: 'telegram', senderId: String(chatId) }),
  })

  const ticket = await aiRes.json()
  await sendMessage(chatId, `✅ Report received! Ticket #${ticket.id} created. We will respond shortly.`)

  return new Response('OK', { status: 200 })
})

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
