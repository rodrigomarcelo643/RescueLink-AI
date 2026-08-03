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
