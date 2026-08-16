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

## 🚀 Recent Key System Upgrades & New Features

### 1. 🌀 Live Incident Feed & Super Typhoon Radar Simulator
- **Super Typhoon Warning Simulator**: Interactive **`Simulate Typhoon Warning 🌀`** engine with real-time distance and landfall impact route telemetry (`Distance: 4.8 km | Landfall ETA: ~24 min | Speed: 185 km/h`).
- **Satellite Eyewall Radar Map Overlay**: Multi-layer radar eyewall simulation (outer rainband radar ring, gale-force wind contour ring, and calm eyewall center `🌀 SUPER TYPHOON EYEWALL 185 KM/H`).
- **Non-Evacuation Content Integrity**: Keeps all public emergency reports, map alerts, and community risk assessments 100% intact and visible during typhoon simulation.

### 2. 🏫 AI Evacuation Directives & Shelter Modals
- **`EvacuationSelectionModal`**: Interactive modal listing all AI-recommended evacuation centers sorted by proximity to the user's fixed GPS location, allowing users to select target evacuation shelters (`Selected Evacuation Target 🎯`).
- **`EvacuationCenterDetailsModal`**: Detailed shelter modal with live capacity progress bars, occupancy, on-site relief supplies (generators, potable water, medical clinic, relief packs), Google Maps directions, and hotline dialing.
- **Supabase Database Persistence**: Fully integrated `public.evacuation_centers` table with UUID primary keys & permissive RLS policies.

### 3. 📢 Facebook Broadcast & AI Pattern Intelligence Center
- **Interactive Broadcast Modal**: Converted the FB Broadcast Publisher into a modal dialog window (`+ New Facebook Broadcast 📢`).
- **AI Pattern Generator**: `generateAIPatternSuggestions()` scans live incident report clusters and auto-fills advisory titles, safety instructions, and disaster categories (`Flash Flood`, `Fire Emergency`, `Typhoon & Winds`, `Landslide`).
- **Database Tracking**: Direct logging to Supabase `fb_posts_tracking` with live status tracking (`synced`, `queued`, `failed`).

### 4. 🗺️ Enhanced Monitoring Map & Agency Operations Map
- **Free Map Dragging & Panning**: Removed controlled center locks across maps to allow unrestricted panning and zooming.
- **Resolved Ticket Filtering**: Automatically hides resolved/closed tickets (`status !== 'rescued' && status !== 'closed'`).
- **Sonar Pulse Ping Rings**: Pulsating CSS sonar ping rings (`animate-ping`) around markers for `critical` and `high` severity emergency alerts.
- **Proof Multi-Media Preview**: Renders proof attachments (images, videos, and emergency voice audio clips) in the detail popup card with a clickable **`View Full Details ↗`** modal window.
- **Registered Agency GPS Routing**: Positions agency markers using registered GPS coordinates (`latitude`, `longitude`) and renders connecting road route lines to emergency scenes.

### 5. ⚡ Performance & Interface Optimization
- **Event-Driven Supabase Realtime**: Replaced aggressive 8-second polling in `FloatingIncidentWidget` with WebSocket push listeners for zero unnecessary network requests.
- **Smart Action Dropdowns**: Viewport boundary calculation and scrollable max-height on `ActionMenu` to prevent dropdown overflow obscuring on the Incidents page.
- **Postgres UUID Syntax Safety**: Automatic fallback handling for Postgres `22P02` UUID syntax constraints during agency dispatch assignments.

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
| **Typhoon Warning Simulator** | Category 4 typhoon simulation with distance/ETA route telemetry & satellite eyewall radar map overlay |
| **Evacuation Center Modals** | Interactive shelter selection modal & full details modal with live capacity and Google Maps directions |
| **Real-time Dashboard** | Live KPI cards, area/bar/pie charts, incident trend graphs, and a live activity feed |
| **Monitoring Map** | Google Maps with real-time clustered incident markers, sonar pulse ping rings, and agency route lines |
| **Facebook Broadcast Center** | AI pattern suggestion advisories, FB Page sync, Messenger DM replies, and `fb_posts_tracking` logging |
| **Volunteer Management** | Track availability, skills, and equipment; auto-match volunteers to incidents |
| **Donations** | Accept and track monetary and in-kind donations via PayMongo |
| **Public Dashboard** | Geo-filtered public view with location detection and radius selector |
| **Embeddable Widget** | Drop-in chat bubble with event-driven Supabase Realtime updates |
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
| Maps | Google Maps via `@vis.gl/react-google-maps` + Polyline route overlays |
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
│   ├── evacuation/      # EvacuationCenterDetailsModal, EvacuationSelectionModal
│   ├── incidents/       # IncidentCard, IncidentMap, FbMonitorPanel, MonitoringMapClusters, HappeningsMapAlert
│   ├── layout/lgu/      # LGUShell, LGUSidebar
│   ├── shared/          # Modal, LoadingSpinner, EmptyState, FloatingIncidentWidget
│   └── ui/              # Button, Input, Card
├── config/              # Nav items and role-based routing config
├── context/             # AuthContext, ModalContext
├── hooks/               # useIncidents, useDonations, useVolunteers, useFacebookPosts, useRealtime
├── pages/               # Dashboard, Incidents, MonitoringMap, FbMonitor, PublicHappenings, AgencyMap, Settings
├── redux/               # Store + slices (auth, incidents, donations)
├── routes/              # AppRouter, ProtectedRoute
├── services/            # Supabase client, auth, incidents, advisories, evacuationCenters, responseAgencies
├── types/               # Incident, Donation, Volunteer, FbPost, EvacuationCenter, User
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

Apply SQL scripts for `rescue_tickets`, `fb_posts_tracking`, and `evacuation_centers` via the Supabase SQL Editor.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

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

## License

MIT © RescueLink AI — Philippines
