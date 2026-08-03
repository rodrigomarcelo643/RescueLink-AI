# 10 — Notifications

Notifications are sent from Supabase Edge Functions — never from the frontend.

---

## Channels

| Channel | Use Case |
|---------|----------|
| Messenger | Ticket acknowledgment, status updates |
| Telegram | Same as Messenger |
| WhatsApp | Same as Messenger |
| SMS | Critical alerts to citizens without internet |
| Email | LGU officer alerts, donation receipts |

---

## SMS (Semaphore — PH Local)

### Setup

1. Register at [semaphore.co](https://semaphore.co)
2. Get API Key → save as Supabase secret:

```bash
supabase secrets set SMS_API_KEY=<key>
supabase secrets set SMS_SENDER_NAME=RescueLinkAI
```

### Usage inside Edge Functions

```ts
async function sendSMS(number: string, message: string) {
  await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: Deno.env.get('SMS_API_KEY'),
      number,
      message,
      sendername: Deno.env.get('SMS_SENDER_NAME'),
    }),
  })
}
```

---

## Email (Resend)

### Setup

1. Register at [resend.com](https://resend.com)
2. Verify your domain
3. Get API Key → save as Supabase secret:

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set MAIL_FROM=noreply@rescuelinkai.ph
```

### Usage inside Edge Functions

```ts
async function sendEmail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    },
    body: JSON.stringify({
      from: Deno.env.get('MAIL_FROM'),
      to,
      subject,
      html,
    }),
  })
}
```

### Donation Receipt Email

```ts
await sendEmail(
  donorEmail,
  'RescueLink AI — Donation Receipt',
  `<h2>Thank you for your donation!</h2>
   <p>Amount: ₱${amount}</p>
   <p>Reference: ${referenceNumber}</p>
   <p>Your contribution helps disaster victims in need.</p>`
)
```

---

## Messenger / Telegram / WhatsApp Push

Status update notifications are sent back through the same channel the citizen used to report.

### Ticket Status Update Trigger

Create a Supabase Database Webhook on `rescue_tickets` UPDATE:

1. Supabase Dashboard → Database → Webhooks → Create
2. Table: `rescue_tickets`, Event: `UPDATE`
3. URL: `https://<project-ref>.supabase.co/functions/v1/notify-citizen`

```
supabase/functions/notify-citizen/index.ts
```

```ts
import { serve } from 'https://deno.land/std/http/server.ts'

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
```

```bash
supabase functions deploy notify-citizen
```
