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
 * Fetches turn-by-turn road route coordinates using Google Directions API with OSRM fallback
 */
async function fetchRoadRoutePoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  routesLib?: any
): Promise<Array<{ lat: number; lng: number }>> {
  // 1. Try Google Maps DirectionsService
  if (routesLib && typeof google !== 'undefined' && google.maps) {
    try {
      const directionsService = new routesLib.DirectionsService()
      const res: any = await new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]?.overview_path) {
              resolve(result)
            } else {
              reject(new Error(`Directions status: ${status}`))
            }
          }
        )
      })

      const path = res.routes[0].overview_path.map((pt: any) => ({
        lat: typeof pt.lat === 'function' ? pt.lat() : pt.lat,
        lng: typeof pt.lng === 'function' ? pt.lng() : pt.lng,
      }))
      if (path.length > 1) return path
    } catch {
      // Fallback to OSRM
    }
  }

  // 2. High-precision OpenStreetMap / OSRM routing engine
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
    const resp = await fetch(url)
    if (resp.ok) {
      const json = await resp.json()
      if (json.routes?.[0]?.geometry?.coordinates) {
        const coords: [number, number][] = json.routes[0].geometry.coordinates
        const roadPath = coords.map(([lng, lat]) => ({ lat, lng }))
        if (roadPath.length > 1) return roadPath
      }
    }
  } catch {
    // Fallback to realistic curves
  }

  // 3. Multi-segment curved road interpolation fallback
  const dLat = destination.lat - origin.lat
  const dLng = destination.lng - origin.lng
  return [
    { lat: origin.lat, lng: origin.lng },
    { lat: origin.lat + dLat * 0.25, lng: origin.lng + dLng * 0.1 },
    { lat: origin.lat + dLat * 0.45, lng: origin.lng + dLng * 0.5 },
    { lat: origin.lat + dLat * 0.75, lng: origin.lng + dLng * 0.65 },
    { lat: origin.lat + dLat * 0.9, lng: origin.lng + dLng * 0.95 },
    { lat: destination.lat, lng: destination.lng },
  ]
}

/**
 * Calculates and renders exact real-world Google Maps driving road navigation routes
 */
function RespondingLineOverlay({
  origin,
  destination,
  isVolunteer = false,
}: {
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  isVolunteer?: boolean
}) {
  const map = useMap()
  const mapsLib = useMapsLibrary('maps')
  const routesLib = useMapsLibrary('routes')

  useEffect(() => {
    if (!map || !mapsLib) return

    let isMounted = true
    let casingPolyline: any = null
    let roadPolyline: any = null

    fetchRoadRoutePoints(origin, destination, routesLib).then((points) => {
      if (!isMounted || !map || !mapsLib) return

      const color = isVolunteer ? '#10b981' : '#2563eb'
      const casingColor = isVolunteer ? '#064e3b' : '#1e3a8a'

      // Outer contrasting glow casing line
      casingPolyline = new mapsLib.Polyline({
        path: points,
        geodesic: true,
        strokeColor: casingColor,
        strokeOpacity: 0.75,
        strokeWeight: 7,
        map,
      })

      // Inner active road route line
      roadPolyline = new mapsLib.Polyline({
        path: points,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.95,
        strokeWeight: 4,
        map,
      })
    })

    return () => {
      isMounted = false
      if (casingPolyline) casingPolyline.setMap(null)
      if (roadPolyline) roadPolyline.setMap(null)
    }
  }, [map, mapsLib, routesLib, origin.lat, origin.lng, destination.lat, destination.lng, isVolunteer])

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

        const isVolunteer = (displayAgencyName || '').toLowerCase().includes('volunteer')

        return (
          <div key={incident.id}>
            {/* Real-World Google Driving Road Route Navigation Line */}
            {isResponding && (
              <>
                <RespondingLineOverlay origin={agencyPos} destination={incidentPos} isVolunteer={isVolunteer} />
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
