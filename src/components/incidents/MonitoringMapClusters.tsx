import { useEffect, useRef } from 'react'
import { useMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { AdvancedMarkerRef } from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import type { Marker } from '@googlemaps/markerclusterer'
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

export default function MonitoringMapClusters({ incidents, onMarkerClick }: Props) {
  const map = useMap()
  const clusterer = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())

  useEffect(() => {
    if (!map) return
    clusterer.current = new MarkerClusterer({ map })
    return () => clusterer.current?.clearMarkers()
  }, [map])

  const setMarkerRef = (marker: AdvancedMarkerRef, id: string) => {
    if (marker && !markersRef.current.has(id)) {
      markersRef.current.set(id, marker as Marker)
      clusterer.current?.addMarker(marker as Marker)
    } else if (!marker && markersRef.current.has(id)) {
      clusterer.current?.removeMarker(markersRef.current.get(id)!)
      markersRef.current.delete(id)
    }
  }

  return (
    <>
      {incidents
        .filter((i) => i.latitude && i.longitude)
        .map((incident) => (
          <AdvancedMarker
            key={incident.id}
            position={{ lat: incident.latitude!, lng: incident.longitude! }}
            ref={(m) => setMarkerRef(m, incident.id)}
            onClick={() => onMarkerClick(incident)}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: SEVERITY_COLOR[incident.severity] ?? '#6b7280',
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </AdvancedMarker>
        ))}
    </>
  )
}
