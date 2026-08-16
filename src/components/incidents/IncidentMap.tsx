import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import { MapPin, AlertCircle } from 'lucide-react'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface Props {
  incidents: Incident[]
  onMarkerClick: (incident: Incident) => void
}

export default function IncidentMap({ incidents, onMarkerClick }: Props) {
  const valid = incidents.filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number')

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
        {valid.map((incident) => {
          const color = SEVERITY_COLOR[incident.severity] ?? '#6b7280'
          const isCriticalOrHigh = incident.severity === 'critical' || incident.severity === 'high'

          return (
            <AdvancedMarker
              key={incident.id}
              position={{ lat: incident.latitude!, lng: incident.longitude! }}
              onClick={() => onMarkerClick(incident)}
            >
              <div className="relative group cursor-pointer flex items-center justify-center">
                {/* Sonar Ping Ring */}
                {isCriticalOrHigh && (
                  <span
                    className="absolute inline-flex size-10 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: color }}
                  />
                )}

                <div
                  className="relative size-8 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white transition-transform group-hover:scale-125 z-10"
                  style={{ backgroundColor: color }}
                >
                  {incident.severity === 'critical' ? (
                    <AlertCircle size={16} className="animate-pulse" />
                  ) : (
                    <MapPin size={16} />
                  )}
                </div>
              </div>
            </AdvancedMarker>
          )
        })}
      </Map>
    </APIProvider>
  )
}
