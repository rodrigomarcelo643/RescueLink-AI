import { AdvancedMarker } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import { MapPin } from 'lucide-react'

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

export default function MonitoringMapClusters({ incidents, onMarkerClick }: Props) {
  const valid = incidents.filter(
    (i) => typeof i.latitude === 'number' && typeof i.longitude === 'number'
  )

  return (
    <>
      {valid.map((incident) => {
        const color = SEVERITY_COLOR[incident.severity] ?? '#6b7280'

        return (
          <AdvancedMarker
            key={incident.id}
            position={{ lat: incident.latitude!, lng: incident.longitude! }}
            onClick={() => onMarkerClick(incident)}
          >
            <div className="relative group cursor-pointer flex flex-col items-center">
              <div
                className="size-8 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform group-hover:scale-125"
                style={{ backgroundColor: color }}
              >
                <MapPin size={16} />
              </div>
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}
