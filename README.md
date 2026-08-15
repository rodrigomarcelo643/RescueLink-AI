<div align="center">

<img src="public/main_logo.jpg" alt="RescueLinkAI" width="170" style="border-radius:12px" />

# RescueLink AI

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=flat-square&logo=openai)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)

**An AI-Powered Disaster Intelligence & Emergency Response Platform**

> *"Turning Disaster Data into Life-Saving Decisions."*

*Built for Local Government Units, Responders, and Communities in the Philippines*

</div>

---

## 🎯 Pitch & Strategic Positioning

> **Winning Pitch Statement**:  
> *"Our platform is an AI-powered Disaster Intelligence and Response System that unifies real-time monitoring, predictive risk assessment, citizen reporting, and emergency coordination into a single command center. By transforming fragmented disaster data into actionable insights and response recommendations, we help governments, responders, and communities act faster, allocate resources better, and ultimately save lives."*

> **The Shift**: Moving from passive monitoring (*"We monitor disasters."*) to active decision intelligence (*"We use AI to predict impact, prioritize response, and coordinate action before lives are at risk."*).

For the full pitch deck strategy, judge Q&A defense, and differentiator breakdown, see [docs/13-pitch-strategy.md](./docs/13-pitch-strategy.md).

---

## The Problem

During disasters, critical information is fragmented across weather agencies, social media, emergency hotlines, local governments, and communities. As a result, responders spend valuable time gathering information instead of acting, while citizens struggle to know where danger exists and what to do next.

Existing tools are siloed — rescue teams use radio, citizens post on Facebook, donations come through bank transfers, and LGU dashboards are updated manually. There is no single intelligence system that connects all of these.

---

## The Solution

**RescueLink AI** acts as an **AI Disaster Command Center**, unifying disaster reporting, predictive risk assessment, emergency coordination, and public information into a single interface.

Instead of replacing existing communication channels, RescueLink AI **integrates with Facebook Messenger, Telegram, WhatsApp, and a web dashboard** — meeting citizens where they already are.

AI automates report classification, prioritization, Community Risk Index scoring, donation matching, and public information dissemination while providing a real-time command dashboard for LGUs and NGOs.

---

## How It Works for User

```
Citizen reports via Messenger / Telegram / WhatsApp / Web
        ↓
AI extracts: disaster type · location · severity · people affected
        ↓
Incident ticket created → LGU dashboard notified in real-time
        ↓
Volunteers matched → Rescue team dispatched
        ↓
Citizen receives SMS/email status update
        ↓
Public dashboard updated → Community stays informed
```

---

## Key Features

| Feature | Description |
|---|---|
| **Multi-channel Intake** | Citizens report via Facebook Messenger, Telegram, WhatsApp, or the embedded web widget |
| **AI Extraction** | OpenAI extracts disaster type, location, severity, and people affected from raw messages |
| **Real-time Dashboard** | Live KPI cards, area/bar/pie charts, incident trend graphs, and a live activity feed |
| **Monitoring Map** | Google Maps with real-time clustered incident markers colored by severity |
| **Facebook Monitoring** | Sync FB page posts, flag AI-detected emergencies, reply via Messenger DMs |
| **Volunteer Management** | Track availability, skills, and equipment; auto-match volunteers to incidents |
| **Donations** | Accept and track monetary and in-kind donations via PayMongo |
| **Public Dashboard** | Geo-filtered public view with location detection and radius selector |
| **Embeddable Widget** | Drop-in chat bubble for any barangay website |
| **Role-based Access** | LGU, NGO, volunteer, and citizen roles |
| **SMS / Email Alerts** | Automated status updates to reporters via Semaphore and Resend |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Redux Toolkit |
| Backend | Supabase (Postgres + Realtime + Auth + Edge Functions) |
| Maps | Google Maps via `@vis.gl/react-google-maps` + MarkerClusterer |
| Charts | Recharts |
| AI | OpenAI GPT (via Supabase Edge Functions) |
| Messaging | Facebook Messenger, Telegram Bot, WhatsApp Business API |
| Payments | PayMongo |
| Notifications | Semaphore SMS, Resend Email |

---

## Project Structure

```
src/
├── components/
│   ├── incidents/       # IncidentCard, IncidentMap, FbMonitorPanel, MonitoringMapClusters
│   ├── layout/lgu/      # LGUShell, LGUSidebar
│   ├── shared/          # Modal, LoadingSpinner, EmptyState, MotionWrappers
│   └── ui/              # Button, Input, Card
├── config/              # Nav items and role-based routing config
├── context/             # AuthContext, ModalContext
├── hooks/               # useIncidents, useDonations, useVolunteers, useFacebookPosts, useRealtime
├── pages/               # Dashboard, Incidents, MonitoringMap, FbMonitor, Donations, Volunteers, Login, PublicDashboard, Settings
├── redux/               # Store + slices (auth, incidents, donations)
├── routes/              # AppRouter, ProtectedRoute
├── services/            # Supabase client, auth, incidents, donations, facebook, volunteers
├── types/               # Incident, Donation, Volunteer, FbPost, User
└── widget/              # Embeddable citizen chat widget
supabase/
├── functions/           # Edge Functions (ai-extract, messenger-webhook, telegram-webhook, etc.)
└── migrations/          # SQL migrations
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- A [Google Maps](https://console.cloud.google.com) API key with Maps JavaScript API + Geocoding enabled
- (Optional) Facebook App, Telegram Bot, WhatsApp Business account

### 1. Clone the repo

```bash
git clone https://github.com/your-org/rescuelinkai.git
cd rescuelinkai
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

### 4. Run database migrations

```bash
pnpm supabase db push
```

Or apply the SQL files in `supabase/migrations/` manually via the Supabase dashboard.

### 5. Deploy Edge Functions

```bash
pnpm supabase functions deploy
```

Set backend secrets:

```bash
supabase secrets set --env-file .env
```

### 6. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Edge Functions only) |
| `OPENAI_API_KEY` | OpenAI key for AI extraction |
| `FB_PAGE_ACCESS_TOKEN` | Facebook Page access token |
| `FB_VERIFY_TOKEN` | Facebook webhook verify token |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `WHATSAPP_TOKEN` | WhatsApp Business API token |
| `PAYMONGO_SECRET_KEY` | PayMongo secret key |
| `SMS_API_KEY` | Semaphore SMS API key |
| `RESEND_API_KEY` | Resend email API key |

See `.env.example` for the full list.

---

## Facebook OAuth (Login)

1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Enable **Facebook** as an OAuth provider in your Supabase dashboard under **Authentication → Providers**
3. Add your Supabase callback URL to the Facebook App's Valid OAuth Redirect URIs:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. The login page opens Facebook auth in a centered popup window automatically.

---

## Supabase Edge Functions

| Function | Trigger | Description |
|---|---|---|
| `ai-extract` | DB insert | Extracts incident data from raw messages using OpenAI |
| `messenger-webhook` | HTTP POST | Receives Facebook Messenger messages |
| `telegram-webhook` | HTTP POST | Receives Telegram bot messages |
| `whatsapp-webhook` | HTTP POST | Receives WhatsApp messages |
| `match-volunteer` | Manual / DB | Matches available volunteers to incidents |
| `notify-citizen` | DB update | Sends SMS/email status updates to reporters |
| `process-donation` | HTTP POST | Handles PayMongo donation webhooks |
| `post-advisory` | Manual | Posts public advisories to Facebook page |
| `sync-fb-posts` | Cron | Syncs Facebook page posts for AI monitoring |
| `sync-messenger-history` | Manual | Backfills Messenger conversation history |

---

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm build:widget # Build embeddable widget bundle
pnpm lint         # Run Oxlint
pnpm preview      # Preview production build
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with a descriptive message
4. Open a pull request

---

## License

MIT © RescueLink AI — Philippines
