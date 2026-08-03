# 08 — Google Maps Integration

## Step 1: Get API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Maps JavaScript API**
3. Create credentials → API Key
4. Restrict key to your domain in production
5. Save as `VITE_GOOGLE_MAPS_API_KEY` in `.env`

---

## Step 2: Install

```bash
pnpm add @vis.gl/react-google-maps
```

---

## Step 3: Provider Setup

```tsx
// src/main.tsx
import { APIProvider } from '@vis.gl/react-google-maps'

root.render(
  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
    <App />
  </APIProvider>
)
```

---

## Step 4: Incident Map Component

```tsx
// src/components/incidents/IncidentMap.tsx
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

interface Props {
  incidents: Incident[]
  onMarkerClick: (incident: Incident) => void
}

export default function IncidentMap({ incidents, onMarkerClick }: Props) {
  return (
    <Map
      defaultCenter={{ lat: 10.3157, lng: 123.8854 }}
      defaultZoom={12}
      mapId="rescuelink-map"
      style={{ width: '100%', height: '100%' }}
    >
      {incidents
        .filter((i) => i.latitude && i.longitude)
        .map((incident) => (
          <AdvancedMarker
            key={incident.id}
            position={{ lat: incident.latitude!, lng: incident.longitude! }}
            onClick={() => onMarkerClick(incident)}
          >
            <Pin
              background={SEVERITY_COLOR[incident.severity]}
              borderColor="#fff"
              glyphColor="#fff"
            />
          </AdvancedMarker>
        ))}
    </Map>
  )
}
```

---

## Step 5: Geocoding (Text → Coordinates)

When a citizen reports a location as text (e.g. "Barangay Mabolo"), convert it to coordinates inside the `ai-extract` Edge Function:

```ts
async function geocode(locationText: string): Promise<{ lat: number; lng: number } | null> {
  const key = Deno.env.get('GOOGLE_MAPS_API_KEY')
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationText + ', Philippines')}&key=${key}`
  )
  const data = await res.json()
  const result = data.results?.[0]?.geometry?.location
  return result ?? null
}
```

Add `GOOGLE_MAPS_API_KEY` to Supabase Edge Function secrets:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=<key>
```
