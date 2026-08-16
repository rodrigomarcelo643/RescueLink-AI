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
  typhoonSimulated?: boolean
  onSelectCoordinates?: (lat: number, lng: number) => void
  onSelectIncident?: (incident: Incident) => void
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

/**
 * Renders live typhoon trajectory route line on the map towards the user GPS position
 */
function TyphoonTrajectoryOverlay({
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
      strokeColor: '#9333ea',
      strokeOpacity: 0.95,
      strokeWeight: 6,
      map,
    })

    return () => {
      polyline.setMap(null)
    }
  }, [map, mapsLib, origin.lat, origin.lng, destination.lat, destination.lng])

  return null
}

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
  const mapsLib = useMapsLibrary('maps')

  useEffect(() => {
    if (!map || !mapsLib) return

    const polyline = new mapsLib.Polyline({
      path: [userLoc, incidentLoc],
      geodesic: true,
      strokeColor: '#ef4444',
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    })

    return () => {
      polyline.setMap(null)
    }
  }, [map, mapsLib, userLoc.lat, userLoc.lng, incidentLoc.lat, incidentLoc.lng])

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
  typhoonSimulated,
  onSelectIncident,
}: Props) {
  const validIncidents = incidents.filter(
    (i) =>
      typeof i.latitude === 'number' &&
      typeof i.longitude === 'number' &&
      i.status !== 'rescued' &&
      i.status !== 'closed'
  )

  const mapAlert = prediction?.mapAlert

  // Simulated Typhoon Eye Coordinates
  const typhoonEye = {
    lat: selectedLocation.lat + 0.035,
    lng: selectedLocation.lng - 0.038,
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900 touch-auto" style={{ height: 500 }}>

      {/* Typhoon Active Live Simulation Telemetry Header */}
      {typhoonSimulated && (
        <div className="absolute top-3 left-3 right-3 z-20 bg-gradient-to-r from-purple-950 via-red-950 to-slate-950 text-white p-3 rounded-xl border border-purple-500 backdrop-blur-md shadow-xl flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-700 text-amber-300 font-extrabold text-sm shadow-md">
              🌀
            </div>
            <div>
              <p className="text-xs font-black uppercase text-purple-200 tracking-wider flex items-center gap-1.5">
                Category 4 Super Typhoon Radar Satellite Track
              </p>
              <p className="text-[11px] font-bold text-amber-300 font-mono">
                Distance: 4.8 km away | Landfall ETA: ~24 min | Speed: 185 km/h
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-white bg-red-600 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
            Immediate Evacuation Urged
          </span>
        </div>
      )}

      {/* Top Floating Map Alert Banner */}
      {!typhoonSimulated && mapAlert && mapAlert.active && (
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
          defaultZoom={12}
          mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          zoomControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          disableDefaultUI={false}
        >
          <MapPanController selectedLocation={selectedLocation} />

          {/* Realistic Satellite Typhoon Radar Spiral & Eyewall Overlay */}
          {typhoonSimulated && (
            <>
              <TyphoonTrajectoryOverlay origin={typhoonEye} destination={selectedLocation} />

              {/* Multi-Layer Radar Rainband & Satellite Wind Overlay */}
              <AdvancedMarker position={typhoonEye}>
                <div className="relative flex flex-col items-center justify-center">
                  {/* Outer Satellite Rainband Radar Ring 1 */}
                  <div className="absolute size-44 rounded-full border-2 border-purple-500/40 bg-purple-600/10 animate-ping opacity-60 pointer-events-none" />

                  {/* Gale-Force Wind Contour Ring 2 */}
                  <div className="absolute size-32 rounded-full border-2 border-red-500/60 bg-red-600/20 animate-pulse pointer-events-none" />

                  {/* Eyewall High-Turbulence Ring 3 */}
                  <div className="absolute size-20 rounded-full border-4 border-amber-400 bg-purple-950/80 shadow-2xl pointer-events-none" />

                  {/* Calm Eye Center Pin */}
                  <div className="relative size-12 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center shadow-2xl text-amber-300 text-lg font-black z-10">
                    🌀
                  </div>

                  <span className="mt-2 px-2.5 py-0.5 text-[9px] font-black text-amber-300 bg-purple-950/95 rounded border border-purple-500 shadow-xl whitespace-nowrap uppercase tracking-wider z-20">
                    🌀 SUPER TYPHOON EYEWALL (185 KM/H)
                  </span>
                </div>
              </AdvancedMarker>
            </>
          )}

          {/* User Fixed Live GPS Location Pin */}
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
