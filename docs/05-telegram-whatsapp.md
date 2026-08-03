# 05 — Telegram & WhatsApp Integration

---

## Telegram

### Step 1: Create Bot

1. Open Telegram → search `@BotFather`
2. Send `/newbot` → follow prompts
3. Copy the **Bot Token** → save as `TELEGRAM_BOT_TOKEN`

### Step 2: Edge Function

```
supabase/functions/telegram-webhook/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'

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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
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
```

### Step 3: Register Webhook

After deploying, call Telegram's `setWebhook` once:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<project-ref>.supabase.co/functions/v1/telegram-webhook"}'
```

### Step 4: Deploy

```bash
supabase functions deploy telegram-webhook
```

---

## WhatsApp (Meta Business API)

### Step 1: Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add product: **WhatsApp**
3. Under WhatsApp → API Setup:
   - Copy **Phone Number ID** → save as `WHATSAPP_PHONE_NUMBER_ID`
   - Generate **Temporary Access Token** (or permanent via System User) → save as `WHATSAPP_TOKEN`
   - Set a **Verify Token** → save as `WHATSAPP_VERIFY_TOKEN`

### Step 2: Edge Function

```
supabase/functions/whatsapp-webhook/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!
const WA_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const url = new URL(req.url)

  // Verification handshake
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ text, attachments: [], channel: 'whatsapp', senderId: from }),
  })

  const ticket = await aiRes.json()

  await sendMessage(from, `✅ Report received! Ticket #${ticket.id} created. We will respond shortly.`)

  return new Response('OK', { status: 200 })
})

async function sendMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WA_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}
```

### Step 3: Register Webhook

1. Facebook Developer Console → WhatsApp → Configuration
2. Webhook URL: `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`
3. Verify Token: your `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to: `messages`

### Step 4: Deploy

```bash
supabase functions deploy whatsapp-webhook
```
