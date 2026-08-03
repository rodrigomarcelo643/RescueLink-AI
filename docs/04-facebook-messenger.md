# 04 — Facebook Messenger Integration

## Overview

Citizens send messages to the official Facebook Page. The Messenger webhook forwards events to a Supabase Edge Function which runs AI extraction and creates a rescue ticket.

---

## Step 1: Facebook App Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. App type: **Business**
3. Add product: **Messenger**
4. Under Messenger → Settings:
   - Connect your Facebook Page
   - Generate a **Page Access Token** → save as `FB_PAGE_ACCESS_TOKEN`
   - Set a **Verify Token** (any random string) → save as `FB_VERIFY_TOKEN`

---

## Step 2: Create Edge Function

```
supabase/functions/messenger-webhook/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'

const FB_VERIFY_TOKEN = Deno.env.get('FB_VERIFY_TOKEN')!
const FB_PAGE_ACCESS_TOKEN = Deno.env.get('FB_PAGE_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const url = new URL(req.url)

  // Webhook verification handshake
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // Incoming message event
  const body = await req.json()
  const entry = body.entry?.[0]
  const messaging = entry?.messaging?.[0]

  if (!messaging?.message) return new Response('OK', { status: 200 })

  const senderId = messaging.sender.id
  const text = messaging.message.text ?? ''
  const attachments = messaging.message.attachments ?? []

  // Call AI extraction edge function
  const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ text, attachments, channel: 'messenger', senderId }),
  })

  const ticket = await aiRes.json()

  // Send acknowledgment back to user
  await sendMessage(senderId, `✅ Report received! Ticket #${ticket.id} created. We will respond shortly.`)

  return new Response('OK', { status: 200 })
})

async function sendMessage(recipientId: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })
}
```

---

## Step 3: Register Webhook

1. Supabase Dashboard → Edge Functions → Copy function URL:
   ```
   https://<project-ref>.supabase.co/functions/v1/messenger-webhook
   ```
2. Facebook Developer Console → Messenger → Webhooks → Edit
3. Callback URL: paste the Edge Function URL
4. Verify Token: your `FB_VERIFY_TOKEN`
5. Subscribe to: `messages`, `messaging_postbacks`

---

## Step 4: Deploy

```bash
supabase functions deploy messenger-webhook
```

---

## Message Flow

```
Citizen sends message on FB Page
        │
        ▼
FB Messenger API
        │  POST event
        ▼
messenger-webhook (Edge Function)
        │
        ├──► ai-extract (Edge Function)
        │         │
        │         ▼
        │    OpenAI GPT extracts:
        │    disaster_type, location,
        │    people_affected, severity
        │         │
        │         ▼
        │    INSERT rescue_tickets
        │
        └──► Send acknowledgment to citizen
```

---

## Supported Message Types

| Type | Handling |
|------|----------|
| Text | Sent to AI extraction |
| Image | Uploaded to Supabase Storage, URL passed to Vision API |
| Video | Stored, URL saved to ticket media_urls |
| Voice | Transcribed via Whisper API, then extracted |
| Location | Latitude/longitude saved directly to ticket |
