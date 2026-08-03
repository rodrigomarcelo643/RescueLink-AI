# 07 — Frontend Dashboard

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- shadcn/ui (Base UI + Nova preset)
- Redux Toolkit (global state)
- React Router v7
- Supabase JS client
- Google Maps JS API

---

## Step 1: Install Dependencies

```bash
pnpm add @supabase/supabase-js @reduxjs/toolkit react-redux react-router-dom
pnpm add @vis.gl/react-google-maps
pnpm add clsx tailwind-merge class-variance-authority @base-ui/react lucide-react
```

---

## Step 2: Supabase Client

```ts
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Generate `src/types/database.ts` from your Supabase project:

```bash
pnpm supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

---

## Step 3: Redux Store

```ts
// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import incidentReducer from './slices/incidentSlice'
import donationReducer from './slices/donationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentReducer,
    donations: donationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

```ts
// src/redux/slices/incidentSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Incident } from '@/types/incident'

interface IncidentState {
  items: Incident[]
  loading: boolean
}

const initialState: IncidentState = { items: [], loading: false }

const incidentSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setIncidents(state, action: PayloadAction<Incident[]>) {
      state.items = action.payload
    },
    addIncident(state, action: PayloadAction<Incident>) {
      state.items.unshift(action.payload)
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const { setIncidents, addIncident, setLoading } = incidentSlice.actions
export default incidentSlice.reducer
```

---

## Step 4: Types

```ts
// src/types/incident.ts
export interface Incident {
  id: string
  channel: 'messenger' | 'telegram' | 'whatsapp' | 'web'
  disaster_type: string
  location_text: string
  latitude: number | null
  longitude: number | null
  people_affected: number | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'responding' | 'rescued' | 'closed'
  priority_score: number
  ai_summary: string | null
  media_urls: string[]
  created_at: string
}
```

```ts
// src/types/donation.ts
export interface Donation {
  id: string
  type: 'monetary' | 'in_kind'
  amount: number | null
  items: Record<string, unknown> | null
  payment_method: string | null
  status: 'pending' | 'confirmed' | 'distributed'
  created_at: string
}
```

---

## Step 5: Services

```ts
// src/services/incidents.service.ts
import { supabase } from './supabase'
import type { Incident } from '@/types/incident'

export const getIncidents = async (): Promise<Incident[]> => {
  const { data, error } = await supabase
    .from('rescue_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const updateIncidentStatus = async (id: string, status: Incident['status']) => {
  const { error } = await supabase
    .from('rescue_tickets')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
```

---

## Step 6: Hooks

```ts
// src/hooks/useIncidents.ts
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getIncidents } from '@/services/incidents.service'
import { setIncidents, addIncident, setLoading } from '@/redux/slices/incidentSlice'
import { supabase } from '@/services/supabase'
import type { RootState } from '@/redux/store'
import type { Incident } from '@/types/incident'

export function useIncidents() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s: RootState) => s.incidents)

  useEffect(() => {
    dispatch(setLoading(true))
    getIncidents().then((data) => {
      dispatch(setIncidents(data))
      dispatch(setLoading(false))
    })

    const channel = supabase
      .channel('rescue_tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rescue_tickets' },
        (payload) => dispatch(addIncident(payload.new as Incident))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dispatch])

  return { items, loading }
}
```

---

## Step 7: Routes

```tsx
// src/routes/index.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import Donations from './pages/Donations'
import Volunteers from './pages/Volunteers'
import PublicDashboard from './pages/PublicDashboard'
import Login from './pages/Login'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/public" element={<PublicDashboard />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/volunteers" element={<Volunteers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

```tsx
// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'

export default function ProtectedRoute() {
  const user = useSelector((s: RootState) => s.auth.user)
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
```

---

## Page Responsibilities

| Page | Responsibility |
|------|---------------|
| `Dashboard.tsx` | Summary stats, live map, recent tickets |
| `Incidents.tsx` | Full ticket queue, status updates, filters |
| `Donations.tsx` | Donation list, totals, allocation |
| `Volunteers.tsx` | Volunteer registry, availability toggle |
| `PublicDashboard.tsx` | Public transparency view (no auth) |
| `Login.tsx` | Supabase email/password auth |
