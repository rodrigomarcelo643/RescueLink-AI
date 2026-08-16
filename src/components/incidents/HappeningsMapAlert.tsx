import { useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import type { AIPredictionResult } from '@/services/aiPredictionService'
import { AlertTriangle, Navigation } from 'lucide-react'

declare const google: any

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

interface Props {
  incidents: Incident[]
  prediction: AIPredictionResult | null
  selectedLocation: { lat: number; lng: number }
  onSelectCoordinates?: (lat: number, lng: number) => void
  onSelectIncident?: (incident: Incident) => void
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

/**
 * Renders real-world driving road routes from fixed user GPS location to nearest incidents
 */
function NearestIncidentRouteOverlay({
  userLoc,
  incidentLoc,
}: {
  userLoc: { lat: number; lng: number }
  incidentLoc: { lat: number; lng: number }
}) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')
  const mapsLib = useMapsLibrary('maps')

  useEffect(() => {
    if (!map) return

    if (routesLib && typeof google !== 'undefined' && google.maps && google.maps.DirectionsService) {
      const directionsService = new routesLib.DirectionsService()
      const directionsRenderer = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#ef4444',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        },
      })

      directionsService.route(
        {
          origin: userLoc,
          destination: incidentLoc,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result)
          }
        }
      )

      return () => {
        directionsRenderer.setMap(null)
      }
    } else if (mapsLib) {
      // Fallback geodesic line
      const polyline = new mapsLib.Polyline({
        path: [userLoc, incidentLoc],
        geodesic: true,
        strokeColor: '#ef4444',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      })

      return () => {
        polyline.setMap(null)
      }
    }
  }, [map, routesLib, mapsLib, userLoc.lat, userLoc.lng, incidentLoc.lat, incidentLoc.lng])

  return null
}

function MapPanController({ selectedLocation }: { selectedLocation: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo(selectedLocation)
    }
  }, [map, selectedLocation?.lat, selectedLocation?.lng])
  return null
}

export default function HappeningsMapAlert({
  incidents,
  prediction,
  selectedLocation,
  onSelectIncident,
}: Props) {
  // Filter active, unresolved incidents
  const validIncidents = incidents.filter(
    (i) =>
      typeof i.latitude === 'number' &&
      typeof i.longitude === 'number' &&
      i.status !== 'rescued' &&
      i.status !== 'closed'
  )

  const mapAlert = prediction?.mapAlert

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900 touch-auto" style={{ height: 500 }}>
      {/* Top Floating Map Alert Banner */}
      {mapAlert && mapAlert.active && (
        <div className="absolute top-3 left-3 right-3 z-10 bg-red-900/90 text-white p-3 rounded-xl border border-red-500 backdrop-blur-md shadow-md flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="relative flex size-3 shrink-0 mt-0.5 sm:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
            </span>
            <div>
              <p className="text-xs font-black tracking-wide uppercase text-red-200 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                {mapAlert.title}
              </p>
              <p className="text-[11px] font-semibold text-red-100 mt-0.5 line-clamp-1">
                {mapAlert.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold bg-red-950/80 px-2.5 py-1 rounded border border-red-700">
            <span>Radius: {mapAlert.radiusKm} km</span>
          </div>
        </div>
      )}

      {/* Map Fixed Location Indicator Badge */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 text-gray-800 text-[11px] font-extrabold px-3 py-1.5 rounded-lg border border-gray-200 backdrop-blur-xs shadow-sm flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
        <span>📍 Fixed Live GPS Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
      </div>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={selectedLocation}
          defaultZoom={13}
          mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          zoomControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          disableDefaultUI={false}
        >
          <MapPanController selectedLocation={selectedLocation} />

          {/* User Fixed Live GPS Location Pin (Non-Adjustable) */}
          <AdvancedMarker position={selectedLocation}>
            <div className="relative flex flex-col items-center">
              <div className="absolute size-10 rounded-full bg-blue-500/30 animate-ping" />
              <div className="size-9 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-xl text-white font-extrabold text-xs z-10">
                <Navigation size={16} />
              </div>
              <span className="mt-1 px-2 py-0.5 text-[9px] font-black text-white bg-blue-950/90 rounded border border-blue-400 shadow-md whitespace-nowrap">
                YOUR FIXED GPS POSITION
              </span>
            </div>
          </AdvancedMarker>

          {/* Render Driving Route Lines to Nearest Incidents */}
          {validIncidents.map((incident) => {
            const isNearest = prediction?.nearestIncidents.some(
              (n) => n.incident.id === incident.id
            )
            const color = SEVERITY_COLOR[incident.severity] ?? '#6b7280'
            const incidentLoc = { lat: incident.latitude!, lng: incident.longitude! }

            return (
              <div key={incident.id}>
                {/* Live Route Navigation Line from User to Nearest Incidents */}
                {isNearest && (
                  <NearestIncidentRouteOverlay userLoc={selectedLocation} incidentLoc={incidentLoc} />
                )}

                <AdvancedMarker
                  position={incidentLoc}
                  onClick={() => onSelectIncident?.(incident)}
                >
                  <div className="relative group cursor-pointer flex flex-col items-center">
                    {isNearest && (
                      <span className="mb-1 bg-red-700 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-md whitespace-nowrap z-20 animate-pulse border border-red-400">
                        🚨 Nearest Active Incident
                      </span>
                    )}
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg transition-transform group-hover:scale-125 z-10"
                      style={{ backgroundColor: color }}
                    >
                      <AlertTriangle size={15} />
                    </div>
                  </div>
                </AdvancedMarker>
              </div>
            )
          })}
        </Map>
      </APIProvider>
    </div>
  )
}
