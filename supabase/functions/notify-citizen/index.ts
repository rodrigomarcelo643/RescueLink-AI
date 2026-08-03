import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const WA_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

serve(async (req) => {
  const { record } = await req.json()
  const { channel, status, reporter_id } = record

  const message = `📢 Update on your report: Status is now "${status.toUpperCase()}". Thank you for reporting to RescueLink AI.`

  if (channel === 'messenger') {
    await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: reporter_id }, message: { text: message } }),
    })
  }

  if (channel === 'telegram') {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: reporter_id, text: message }),
    })
  }

  if (channel === 'whatsapp') {
    await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: reporter_id,
        type: 'text',
        text: { body: message },
      }),
    })
  }

  return new Response('OK', { status: 200 })
})
