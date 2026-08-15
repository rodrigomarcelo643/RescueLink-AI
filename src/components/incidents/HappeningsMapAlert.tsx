import { useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import type { Incident } from '@/types/incident'
import type { AIPredictionResult } from '@/services/aiPredictionService'
import { AlertTriangle, MapPin, Navigation } from 'lucide-react'

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
  onSelectCoordinates: (lat: number, lng: number) => void
  onSelectIncident?: (incident: Incident) => void
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

function MapPanController({ selectedLocation }: { selectedLocation: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo(selectedLocation)
    }
  }, [map, selectedLocation])
  return null
}

function MapEventReceiver({ onSelectCoordinates }: { onSelectCoordinates: (lat: number, lng: number) => void }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', (e: any) => {
      if (e.latLng) {
        onSelectCoordinates(e.latLng.lat(), e.latLng.lng())
      }
    })
    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [map, onSelectCoordinates])

  return null
}

export default function HappeningsMapAlert({
  incidents,
  prediction,
  selectedLocation,
  onSelectCoordinates,
  onSelectIncident,
}: Props) {
  const validIncidents = incidents.filter(
    (i) => typeof i.latitude === 'number' && typeof i.longitude === 'number'
  )

  const mapAlert = prediction?.mapAlert

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900" style={{ height: 480 }}>
      {/* Top Floating Map Alert Banner */}
      {mapAlert && mapAlert.active && (
        <div className="absolute top-3 left-3 right-3 z-10 bg-red-900/90 text-white p-3 rounded-lg border border-red-500 backdrop-blur-md shadow-md flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
            </span>
            <div>
              <p className="text-xs font-black tracking-wide uppercase text-red-200 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-400" />
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

      {/* Map Control Helper Hint */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 text-gray-800 text-[11px] font-bold px-3 py-1.5 rounded-md border border-gray-200 backdrop-blur-xs shadow-xs flex items-center gap-1.5">
        <MapPin size={12} className="text-red-600" />
        Click anywhere on map to predict risk & nearest accidents
      </div>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={selectedLocation}
          center={selectedLocation}
          defaultZoom={13}
          mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
        >
          <MapPanController selectedLocation={selectedLocation} />
          <MapEventReceiver onSelectCoordinates={onSelectCoordinates} />

          {/* User Selected Target Location Pin */}
          <AdvancedMarker position={selectedLocation}>
            <div className="relative flex items-center justify-center">
              <div className="absolute size-10 rounded-full bg-blue-500/30 animate-ping" />
              <div className="size-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg text-white font-extrabold text-xs">
                <Navigation size={14} />
              </div>
            </div>
          </AdvancedMarker>

          {/* Active Incidents & Nearest Accidents Markers */}
          {validIncidents.map((incident) => {
            const isNearest = prediction?.nearestIncidents.some(
              (n) => n.incident.id === incident.id
            )
            const color = SEVERITY_COLOR[incident.severity] ?? '#6b7280'

            return (
              <AdvancedMarker
                key={incident.id}
                position={{ lat: incident.latitude!, lng: incident.longitude! }}
                onClick={() => onSelectIncident?.(incident)}
              >
                <div className="relative group cursor-pointer">
                  {isNearest && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap z-20">
                      Nearest Incident
                    </span>
                  )}
                  <div
                    className="size-7 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md transition-transform group-hover:scale-125"
                    style={{ backgroundColor: color }}
                  >
                    <AlertTriangle size={13} />
                  </div>
                </div>
              </AdvancedMarker>
            )
          })}
        </Map>
      </APIProvider>
    </div>
  )
}
