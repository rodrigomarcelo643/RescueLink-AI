# 02 — Environment Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account + project
- Supabase CLI (`pnpm add -g supabase`)
- Facebook Developer account
- OpenAI account

## Frontend `.env` Variables

Copy `.env.example` to `.env.development` and `.env.production`:

```env
# Supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=<key>

# App
VITE_APP_NAME=RescueLinkAI
VITE_APP_ENV=development
```

> Never expose `service_role` key in the frontend. It belongs only in Edge Functions.

## Supabase Edge Functions Secrets

Set these via Supabase Dashboard → Project Settings → Edge Functions → Secrets,
or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set FB_PAGE_ACCESS_TOKEN=...
supabase secrets set FB_VERIFY_TOKEN=...
supabase secrets set FB_PAGE_ID=...
supabase secrets set TELEGRAM_BOT_TOKEN=...
supabase secrets set WHATSAPP_TOKEN=...
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=...
supabase secrets set WHATSAPP_VERIFY_TOKEN=...
supabase secrets set PAYMONGO_SECRET_KEY=sk_...
supabase secrets set SMS_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Local Frontend Setup

```bash
pnpm install
pnpm dev
```

## Local Supabase Setup

```bash
supabase login
supabase init          # only first time
supabase start         # spins up local Postgres + Auth + Storage
supabase db push       # apply migrations
```

Local Supabase Studio runs at: `http://localhost:54323`

## Deploying Edge Functions

```bash
# Deploy a single function
supabase functions deploy messenger-webhook

# Deploy all
supabase functions deploy
```

## Webhook Tunneling (Local Dev)

Use [ngrok](https://ngrok.com) to expose local Supabase Edge Functions for chatbot webhooks:

```bash
ngrok http 54321
```

Use the generated `https://` URL as:
- Facebook Messenger webhook URL
- Telegram `setWebhook` endpoint
- WhatsApp Business API webhook config

Webhook base path pattern:
```
https://<ngrok-url>/functions/v1/messenger-webhook
https://<ngrok-url>/functions/v1/telegram-webhook
https://<ngrok-url>/functions/v1/whatsapp-webhook
```
