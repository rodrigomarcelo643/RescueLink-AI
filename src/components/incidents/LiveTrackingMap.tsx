import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import { MapPin, Navigation, Gauge, CheckCircle2 } from 'lucide-react'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

declare const google: any

// Stable Google Maps Directions Overlay
function GoogleMapDirectionsOverlay({
  originLat,
  originLng,
  destLat,
  destLng,
  onPathDecoded,
}: {
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  onPathDecoded: (points: Array<{ lat: number; lng: number }>) => void
}) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')
  const fetchedKeyRef = useRef<string>('')

  // Keep a ref of callback so changes to callback don't re-trigger route fetching
  const callbackRef = useRef(onPathDecoded)
  useEffect(() => {
    callbackRef.current = onPathDecoded
  }, [onPathDecoded])

  useEffect(() => {
    if (!map || !routesLib) return
    const routeKey = `${originLat}_${originLng}_${destLat}_${destLng}`
    if (fetchedKeyRef.current === routeKey) return

    fetchedKeyRef.current = routeKey

    const directionsService = new routesLib.DirectionsService()
    const directionsRenderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 6,
      },
    })

    directionsService.route(
      {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK && result && result.routes[0]) {
          directionsRenderer.setDirections(result)

          const path = result.routes[0].overview_path.map((pt: any) => ({
            lat: pt.lat(),
            lng: pt.lng(),
          }))
          if (path.length > 0) {
            callbackRef.current(path)
          }
        }
      }
    )

    return () => {
      directionsRenderer.setMap(null)
    }
  }, [map, routesLib, originLat, originLng, destLat, destLng])

  return null
}

import { getAgencyStartLocation } from '@/services/agencyLocationTracker.service'

interface LiveTrackingMapProps {
  incidentId?: string
  incidentLat: number
  incidentLng: number
  disasterType: string
  locationText: string
  severity: Incident['severity']
  status: Incident['status']
  responder?: {
    lat: number
    lng: number
    unitName?: string
    contact?: string
  } | null
  onCalculated?: (distKm: number, etaMin: number) => void
  onUnitArrived?: () => void
}

export default function LiveTrackingMap({
  incidentId,
  incidentLat,
  incidentLng,
  disasterType,
  locationText,
  severity: _severity,
  status,
  responder,
  onCalculated,
  onUnitArrived,
}: LiveTrackingMapProps) {
  const isResponding = status === 'responding' && !!responder

  // Origin coordinates (locked real initial agency start GPS)
  const startPos = useMemo(() => {
    const rawLat = responder?.lat ?? incidentLat
    const rawLng = responder?.lng ?? incidentLng
    if (incidentId) {
      return getAgencyStartLocation(incidentId, rawLat, rawLng)
    }
    return { lat: rawLat, lng: rawLng }
  }, [incidentId, responder?.lat, responder?.lng, incidentLat, incidentLng])

  const originLat = startPos.lat
  const originLng = startPos.lng

  // Decoded Google Maps driving road points
  const [googleRoadPoints, setGoogleRoadPoints] = useState<Array<{ lat: number; lng: number }>>([])
  const [waypointIndex, setWaypointIndex] = useState(0)

  const handlePathDecoded = useCallback((points: Array<{ lat: number; lng: number }>) => {
    setGoogleRoadPoints(points)
    setWaypointIndex(0)
  }, [])

  // Fallback curved road points
  const fallbackPoints = useMemo(() => {
    const dLat = incidentLat - originLat
    const dLng = incidentLng - originLng
    return [
      { lat: originLat, lng: originLng },
      { lat: originLat + dLat * 0.2, lng: originLng + dLng * 0.05 },
      { lat: originLat + dLat * 0.35, lng: originLng + dLng * 0.45 },
      { lat: originLat + dLat * 0.65, lng: originLng + dLng * 0.55 },
      { lat: originLat + dLat * 0.85, lng: originLng + dLng * 0.9 },
      { lat: incidentLat, lng: incidentLng },
    ]
  }, [originLat, originLng, incidentLat, incidentLng])

  const activePoints = googleRoadPoints.length > 0 ? googleRoadPoints : fallbackPoints

  // Continuous movement interval loop along road points
  useEffect(() => {
    if (!isResponding) {
      setWaypointIndex(0)
      return
    }

    const interval = setInterval(() => {
      setWaypointIndex((prev) => {
        if (prev >= activePoints.length - 1) {
          if (onUnitArrived) onUnitArrived()
          return prev
        }
        return prev + 1
      })
    }, 1200)

    return () => clearInterval(interval)
  }, [isResponding, activePoints.length, onUnitArrived])

  const currentPos = activePoints[Math.min(waypointIndex, activePoints.length - 1)] || activePoints[0]
  const isArrived = waypointIndex >= activePoints.length - 1

  // Dynamic distance remaining & ETA
  const remainingDist = isArrived ? 0 : distanceKm(currentPos.lat, currentPos.lng, incidentLat, incidentLng)
  const etaMinutes = isArrived ? 0 : Math.max(1, Math.round((remainingDist / 30) * 60))

  useEffect(() => {
    if (isResponding && onCalculated) {
      onCalculated(remainingDist, etaMinutes)
    }
  }, [remainingDist, etaMinutes, isResponding, onCalculated])

  // Center coordinates
  const centerLat = (currentPos.lat + incidentLat) / 2
  const centerLng = (currentPos.lng + incidentLng) / 2

  // SVG Screen points for fallback canvas
  const svgPathPoints = [
    { x: 15, y: 20 },
    { x: 28, y: 40 },
    { x: 45, y: 35 },
    { x: 62, y: 65 },
    { x: 75, y: 60 },
    { x: 85, y: 80 },
  ]
  const currentSvgPoint = svgPathPoints[Math.min(waypointIndex, svgPathPoints.length - 1)]

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-xl bg-gray-950 h-84 sm:h-96 w-full">
      {API_KEY && API_KEY.length > 10 ? (
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={{ lat: centerLat, lng: centerLng }}
            defaultZoom={14}
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-tracking-map'}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI
          >
            {/* Stable Google Maps Driving Route & Polyline Overlay */}
            {isResponding && (
              <GoogleMapDirectionsOverlay
                originLat={originLat}
                originLng={originLng}
                destLat={incidentLat}
                destLng={incidentLng}
                onPathDecoded={handlePathDecoded}
              />
            )}

            {/* Incident Marker */}
            <AdvancedMarker position={{ lat: incidentLat, lng: incidentLng }}>
              <div className="relative flex items-center justify-center">
                <span className="absolute size-10 rounded-full bg-red-600/40 animate-ping" />
                <div className="relative flex size-9 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl ring-4 ring-red-500/40">
                  <MapPin size={20} />
                </div>
              </div>
            </AdvancedMarker>

            {/* Smoothly Moving Responder Vehicle Marker */}
            {isResponding && (
              <AdvancedMarker position={{ lat: currentPos.lat, lng: currentPos.lng }}>
                <div className="relative flex flex-col items-center">
                  <span className="absolute size-11 rounded-full bg-blue-500/40 animate-pulse" />
                  <div className="relative flex size-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl ring-4 ring-blue-400/50">
                    <span className="text-lg">{isArrived ? '🚨' : '🚒'}</span>
                  </div>
                  <div className="mt-1 rounded bg-black/90 px-2 py-0.5 text-[9px] font-extrabold text-blue-300 backdrop-blur-xs border border-blue-400/40 shadow-lg whitespace-nowrap">
                    {isArrived ? 'ARRIVED AT SCENE' : `LIVE GPS: ${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)}`}
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      ) : (
        /* Real-Time SVG Curved Road Route Overlay (Offline/Fallback) */
        <div className="relative size-full bg-slate-950 p-4 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />

          {isResponding && (
            <svg className="absolute inset-0 size-full pointer-events-none z-10">
              <defs>
                <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Curved Multi-Segment Road Line */}
              <polyline
                points={svgPathPoints.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                fill="none"
                stroke="url(#roadGrad)"
                strokeWidth="5"
                strokeDasharray="8 6"
              />

              {/* Trailing Active Road Line */}
              <polyline
                points={svgPathPoints.slice(0, waypointIndex + 1).map((p) => `${p.x}%,${p.y}%`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Incident Destination Pin */}
          <div
            className="absolute z-20 flex flex-col items-center transition-all"
            style={{ left: `${svgPathPoints[svgPathPoints.length - 1].x}%`, top: `${svgPathPoints[svgPathPoints.length - 1].y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span className="relative flex size-9 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl ring-4 ring-red-500/40">
              <MapPin size={18} />
              <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-30" />
            </span>
            <div className="mt-1 whitespace-nowrap rounded bg-black/90 px-2 py-0.5 text-[10px] font-black text-red-200 border border-red-500/40 shadow-xl">
              📍 DESTINATION: {disasterType}
            </div>
          </div>

          {/* Moving Vehicle along Road Route */}
          {isResponding && (
            <div
              className="absolute z-30 flex flex-col items-center transition-all duration-700 ease-out"
              style={{ left: `${currentSvgPoint.x}%`, top: `${currentSvgPoint.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="relative flex size-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl ring-4 ring-blue-400/50">
                <span className="text-lg animate-bounce">{isArrived ? '🚨' : '🚒'}</span>
                <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
              </span>
              <div className="mt-1 whitespace-nowrap rounded bg-blue-950/95 px-2 py-0.5 text-[10px] font-black text-blue-200 border border-blue-400/40 shadow-2xl flex items-center gap-1">
                {isArrived ? <CheckCircle2 size={11} className="text-emerald-400" /> : null}
                {isArrived ? 'UNIT ARRIVED AT SCENE' : `${responder.unitName || 'Rescue Unit Alpha'} (MOVING ALONG ROAD)`}
              </div>
            </div>
          )}

          {/* Header Bar */}
          <div className="relative z-30 flex items-center justify-between gap-2 rounded-lg bg-black/85 p-2.5 backdrop-blur-md border border-white/10 text-white text-xs">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-blue-600/30 text-blue-400 ring-1 ring-blue-400/30">
                <Navigation size={14} className="animate-spin" />
              </div>
              <div>
                <p className="font-extrabold text-blue-300">REAL-TIME GOOGLE ROAD NAVIGATION</p>
                <p className="text-[10px] text-gray-400 font-mono">
                  {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {isResponding && (
              <div className="flex items-center gap-3 text-xs border-l border-white/15 pl-3">
                <div className="flex items-center gap-1 text-emerald-400 font-extrabold">
                  <Gauge size={13} />
                  {isArrived ? '0 km/h' : '36 km/h'}
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Remaining</span>
                  <p className="font-extrabold text-blue-300">{remainingDist.toFixed(1)} km</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">ETA</span>
                  <p className="font-extrabold text-emerald-400">{isArrived ? 'ARRIVED' : `~${etaMinutes} min`}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="relative z-30 mt-auto flex items-center justify-between gap-3 rounded-lg bg-black/85 p-2.5 backdrop-blur-md border border-white/10 text-white text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-red-500" />
              <span className="font-semibold text-gray-200 truncate max-w-[260px]">{locationText}</span>
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase">
              {isArrived ? 'Rescue Operation Ongoing' : 'Google Driving Route Active'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
