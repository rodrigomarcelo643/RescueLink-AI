# RescueLink AI — Documentation Index

An AI-Powered Disaster Response, Relief Coordination, and Public Information Platform.

## Docs

| File | Description |
|------|-------------|
| [01-project-structure.md](./01-project-structure.md) | Folder layout, coding standards, naming conventions |
| [02-environment-setup.md](./02-environment-setup.md) | `.env` variables, local dev, Supabase CLI, ngrok |
| [03-supabase.md](./03-supabase.md) | DB schema, RLS policies, auth, storage, realtime, triggers |
| [04-facebook-messenger.md](./04-facebook-messenger.md) | Messenger webhook, bot flow, AI extraction |
| [05-telegram-whatsapp.md](./05-telegram-whatsapp.md) | Telegram Bot API and WhatsApp Business API |
| [06-ai-integration.md](./06-ai-integration.md) | OpenAI GPT extraction, vision analysis, volunteer matching |
| [07-frontend-dashboard.md](./07-frontend-dashboard.md) | React + TypeScript, Redux, hooks, services, routes |
| [08-maps-integration.md](./08-maps-integration.md) | Google Maps API, incident markers, geocoding |
| [09-payments.md](./09-payments.md) | PayMongo donation flow, webhooks, in-kind donations |
| [10-notifications.md](./10-notifications.md) | SMS (Semaphore), Email (Resend), Messenger/Telegram/WhatsApp push |
| [11-facebook-page-automation.md](./11-facebook-page-automation.md) | Auto-post verified advisories to FB Page |
| [12-deployment.md](./12-deployment.md) | Vercel, Supabase prod, GitHub Actions CI/CD, checklist |
| [13-pitch-strategy.md](./13-pitch-strategy.md) | Pitch positioning, judge Q&A defense, core AI engines, value proposition |
| [14-weather-pagasa-integration.md](./14-weather-pagasa-integration.md) | Weather APIs, PAGASA TCWS Signals, DOST water sensors, AI hazard scoring |
| [15-pwa-phone-widget.md](./15-pwa-phone-widget.md) | Mobile PWA, standalone app window, home screen widget, offline service worker |

---

## System Flow

```
Citizen (Messenger / Telegram / WhatsApp / Web)
        │
        ▼
  Chatbot Webhook (Supabase Edge Function)
        │
        ▼
  ai-extract Edge Function
  ├── GPT-4o-mini  → disaster_type, location, severity
  └── GPT-4o Vision → image analysis (if media)
        │
        ▼
  rescue_tickets (Supabase DB)
        │
        ├──► Realtime → LGU Dashboard (React)
        ├──► match-volunteer → nearest available volunteer
        ├──► notify-citizen → status updates via same channel
        ├──► process-donation → PayMongo payment link
        └──► post-advisory → FB Page auto-post (if threshold met)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| State | Redux Toolkit |
| Routing | React Router v7 |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth + Storage + Realtime) |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| Maps | Google Maps JS API |
| Payments | PayMongo |
| SMS | Semaphore |
| Email | Resend |
| Chatbots | Facebook Messenger API, Telegram Bot API, WhatsApp Business API |
| Hosting | Vercel (frontend), Supabase Cloud (backend) |
| CI/CD | GitHub Actions |
