# 01 — Project Structure & Coding Standards

## Frontend (React + TypeScript + Vite)

```
src/
├── components/
│   ├── ui/                  # shadcn/base-ui primitives (button, card, etc.)
│   ├── layout/              # AppShell, Sidebar, Topbar, PageWrapper
│   ├── incidents/           # IncidentCard, IncidentMap, StatusBadge
│   ├── donations/           # DonationForm, DonationTracker, Receipt
│   ├── volunteers/          # VolunteerList, MatchCard
│   └── shared/              # Avatar, Badge, EmptyState, LoadingSpinner
├── hooks/
│   ├── useIncidents.ts      # CRUD + realtime rescue tickets
│   ├── useDonations.ts      # Donation records
│   ├── useVolunteers.ts     # Volunteer list and matching
│   ├── useAuth.ts           # Supabase auth state
│   └── useRealtime.ts       # Supabase realtime channel subscriptions
├── services/
│   ├── supabase.ts          # Supabase client init
│   ├── incidents.service.ts # DB calls for rescue_tickets table
│   ├── donations.service.ts # DB calls for donations table
│   ├── volunteers.service.ts
│   └── storage.service.ts   # Supabase Storage (images/videos)
├── lib/
│   ├── utils.ts             # cn(), formatDate(), formatCurrency()
│   └── supabase-helpers.ts  # Typed query wrappers
├── redux/
│   ├── store.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── incidentSlice.ts
│       └── donationSlice.ts
├── routes/
│   ├── index.tsx            # React Router root
│   ├── ProtectedRoute.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Incidents.tsx
│       ├── Donations.tsx
│       ├── Volunteers.tsx
│       ├── PublicDashboard.tsx
│       └── Login.tsx
├── types/
│   ├── incident.ts
│   ├── donation.ts
│   ├── volunteer.ts
│   └── user.ts
└── constants/
    ├── incidentStatus.ts
    └── disasterTypes.ts
```

## Backend (Supabase)

All backend logic lives in Supabase — no separate server needed for core features.

```
Supabase Project
├── Database (PostgreSQL)
│   ├── Tables
│   │   ├── profiles
│   │   ├── rescue_tickets
│   │   ├── donations
│   │   ├── volunteers
│   │   ├── evacuation_centers
│   │   └── public_advisories
│   ├── Row Level Security (RLS) policies per table
│   └── Database Functions / Triggers
│       ├── on_new_ticket_notify()
│       └── auto_assign_priority()
├── Auth
│   ├── Email + Password (LGU officers)
│   └── Anonymous sessions (citizens via web)
├── Storage
│   └── incident-media bucket (images, videos)
├── Edge Functions (Deno)
│   ├── messenger-webhook/   # Receive FB Messenger events
│   ├── telegram-webhook/    # Receive Telegram events
│   ├── whatsapp-webhook/    # Receive WhatsApp events
│   ├── ai-extract/          # Call OpenAI, return structured data
│   ├── match-volunteer/     # Volunteer matching logic
│   ├── process-donation/    # PayMongo/Xendit webhook handler
│   └── post-advisory/       # Auto-post to FB Page
└── Realtime
    └── rescue_tickets channel (LGU dashboard live updates)
```

## Coding Standards

### TypeScript / React
- Functional components only, one per file
- Props typed with `interface`
- Hooks in `src/hooks/`, services in `src/services/`
- Components never call Supabase directly — always through a service
- Tailwind classes only, no inline styles
- Barrel `index.ts` exports per folder

### Naming
| Item | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `IncidentCard.tsx` |
| Hook | camelCase + `use` prefix | `useIncidents.ts` |
| Service | camelCase + `.service` suffix | `incidents.service.ts` |
| Type/Interface | PascalCase | `Incident` |
| Constant | SCREAMING_SNAKE | `INCIDENT_STATUS` |
| Supabase table | snake_case | `rescue_tickets` |
| Edge Function | kebab-case folder | `ai-extract/` |

### Git Branches
```
main        → production
develop     → integration
feature/*   → new features
fix/*       → bug fixes
```
