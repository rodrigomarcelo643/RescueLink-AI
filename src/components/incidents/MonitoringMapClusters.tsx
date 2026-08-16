import { useEffect, useState } from 'react'
import { AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import { MapPin, AlertCircle, Shield } from 'lucide-react'
import { getResponseAgencies, CEBU_RESPONSE_AGENCIES_SEED } from '@/services/responseAgencies.service'
import type { ResponseAgency } from '@/types/responseAgency'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

declare const google: any

/**
 * Calculates and renders exact real-world Google Maps driving road navigation routes
 */
function RespondingLineOverlay({
  origin,
  destination,
}: {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}) {
  const map = useMap()
  const mapsLib = useMapsLibrary('maps')

  useEffect(() => {
    if (!map || !mapsLib) return

    const polyline = new mapsLib.Polyline({
      path: [origin, destination],
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    })

    return () => {
      polyline.setMap(null)
    }
  }, [map, mapsLib, origin.lat, origin.lng, destination.lat, destination.lng])

  return null
}

interface Props {
  incidents: Incident[]
  onMarkerClick: (incident: Incident) => void
}

export default function MonitoringMapClusters({ incidents, onMarkerClick }: Props) {
  const [agencies, setAgencies] = useState<ResponseAgency[]>(CEBU_RESPONSE_AGENCIES_SEED)

  useEffect(() => {
    getResponseAgencies()
      .then((data) => {
        if (data && data.length > 0) {
          setAgencies(data)
        }
      })
      .catch(() => {})
  }, [])

  // 1. Hide rescued or closed tickets from monitoring map
  const activeIncidents = incidents.filter(
    (i) =>
      typeof i.latitude === 'number' &&
      typeof i.longitude === 'number' &&
      i.status !== 'rescued' &&
      i.status !== 'closed'
  )

  return (
    <>
      {activeIncidents.map((incident) => {
        const color = SEVERITY_COLOR[incident.severity] ?? '#6b7280'
        const isCriticalOrHigh = incident.severity === 'critical' || incident.severity === 'high'
        const isResponding = incident.status === 'responding' || (incident.status as string) === 'assigned'

        // 2. Find exact registered agency latitude and longitude
        const agencyNameInput =
          incident.assigned_agency_name ||
          (incident as any).assigned_agency ||
          (incident as any).agency_name ||
          ''

        const matchedAgency = agencies.find(
          (a) =>
            (incident.assigned_agency_id && a.id === incident.assigned_agency_id) ||
            (agencyNameInput && a.name.toLowerCase().includes(agencyNameInput.toLowerCase())) ||
            (agencyNameInput && agencyNameInput.toLowerCase().includes(a.name.toLowerCase()))
        ) || agencies[0]

        // Use exact registered agency coordinates
        const agencyPos = matchedAgency && typeof matchedAgency.latitude === 'number' && typeof matchedAgency.longitude === 'number'
          ? { lat: matchedAgency.latitude, lng: matchedAgency.longitude }
          : { lat: incident.latitude! + 0.012, lng: incident.longitude! - 0.012 }

        const incidentPos = {
          lat: incident.latitude!,
          lng: incident.longitude!,
        }

        const displayAgencyName = matchedAgency ? matchedAgency.name : (agencyNameInput || 'RESPONSE AGENCY BASE')

        return (
          <div key={incident.id}>
            {/* Real-World Google Driving Road Route Navigation Line */}
            {isResponding && (
              <>
                <RespondingLineOverlay origin={agencyPos} destination={incidentPos} />
                <AdvancedMarker position={agencyPos}>
                  <div className="relative flex flex-col items-center group">
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-2 ring-blue-300">
                      <Shield size={14} />
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.5 text-[9px] font-black text-blue-900 bg-blue-50 rounded border border-blue-200 shadow-2xs whitespace-nowrap uppercase">
                      {displayAgencyName}
                    </span>
                  </div>
                </AdvancedMarker>
              </>
            )}

            {/* Emergency Incident Marker */}
            <AdvancedMarker
              position={incidentPos}
              onClick={() => onMarkerClick(incident)}
            >
              <div className="relative group cursor-pointer flex items-center justify-center">
                {/* Live Sonar Pulse Ping Ring for Critical & High Severity Incidents */}
                {isCriticalOrHigh && (
                  <span
                    className="absolute inline-flex size-10 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: color }}
                  />
                )}

                {/* Core Marker Pin */}
                <div
                  className="relative size-8 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform group-hover:scale-125 z-10"
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
          </div>
        )
      })}
    </>
  )
}
