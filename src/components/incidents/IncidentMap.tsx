import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

function PinIcon({ color }: { color: string }) {
  return (
    <div style={{ width: 24, height: 32, cursor: 'pointer' }}>
      <svg
        width="24"
        height="32"
        viewBox="0 0 28 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
      >
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill={color}
        />
        <circle cx="14" cy="14" r="5.5" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  )
}

interface Props {
  incidents: Incident[]
  onMarkerClick: (incident: Incident) => void
}

export default function IncidentMap({ incidents, onMarkerClick }: Props) {
  const valid = incidents.filter((i) => i.latitude && i.longitude)

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={{ lat: 10.3157, lng: 123.8854 }}
        defaultZoom={10}
        mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        disableDefaultUI
      >
        {valid.map((incident) => (
          <AdvancedMarker
            key={incident.id}
            position={{ lat: incident.latitude!, lng: incident.longitude! }}
            onClick={() => onMarkerClick(incident)}
          >
            <PinIcon color={SEVERITY_COLOR[incident.severity] ?? '#6b7280'} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
