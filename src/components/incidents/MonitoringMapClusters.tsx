import { AdvancedMarker } from '@vis.gl/react-google-maps'
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

function PinIcon({ color }: { color: string }) {
  return (
    <div style={{ position: 'relative', width: 28, height: 36, cursor: 'pointer' }}>
      <svg
        width="28"
        height="36"
        viewBox="0 0 28 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        {/* Pin body */}
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill={color}
        />
        {/* White inner circle */}
        <circle cx="14" cy="14" r="5.5" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  )
}

export default function MonitoringMapClusters({ incidents, onMarkerClick }: Props) {
  const valid = incidents.filter(
    (i) => typeof i.latitude === 'number' && typeof i.longitude === 'number'
  )

  return (
    <>
      {valid.map((incident) => (
        <AdvancedMarker
          key={incident.id}
          position={{ lat: incident.latitude!, lng: incident.longitude! }}
          onClick={() => onMarkerClick(incident)}
        >
          <PinIcon color={SEVERITY_COLOR[incident.severity] ?? '#6b7280'} />
        </AdvancedMarker>
      ))}
    </>
  )
}
