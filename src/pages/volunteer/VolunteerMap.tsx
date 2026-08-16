import { useState, useEffect } from 'react'
import { getIncidents } from '@/services/incidents.service'
import type { Incident } from '@/types/incident'
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps'
import LiveTrackingMap from '@/components/incidents/LiveTrackingMap'
import {
  Navigation, Radio, AlertTriangle, HeartHandshake, CheckCircle2, X
} from 'lucide-react'

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || ''
const DEFAULT_CENTER = { lat: 10.3157, lng: 123.8854 } // Cebu City

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export default function VolunteerMap() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [assistingIds, setAssistingIds] = useState<string[]>([])
  const [ignoredIds, setIgnoredIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  // Track live GPS position
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS error:', err),
        { enableHighAccuracy: true }
      )
    }

    getIncidents().then((list) => {
      setIncidents(list.filter((i) => i.status === 'pending' || i.status === 'responding'))
    })
  }, [])

  const handleDecision = (id: string, action: 'assist' | 'ignore') => {
    if (action === 'assist') {
      setAssistingIds((prev) => [...prev, id])
      setIgnoredIds((prev) => prev.filter((x) => x !== id))
      setNotice(`You volunteered to assist on Ticket #${id.slice(0, 8)}. Mission registered! 🙋‍♂️`)
    } else {
      setIgnoredIds((prev) => [...prev, id])
      setAssistingIds((prev) => prev.filter((x) => x !== id))
      setNotice(`Incident Ticket #${id.slice(0, 8)} ignored.`)
    }
    setTimeout(() => setNotice(null), 3500)
  }

  const mapCenter = coords || DEFAULT_CENTER
  const visibleIncidents = incidents.filter((i) => !ignoredIds.includes(i.id))

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header Info */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <Radio size={20} className="text-red-700 animate-pulse" />
            Live Operations Map of Nearest Incidents
          </h1>
          <p className="text-xs text-gray-400">
            Real-time disaster reports centered around your current GPS location coordinates.
          </p>
        </div>

        {coords && (
          <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono text-emerald-700 font-extrabold shadow-2xs">
            📍 GPS Position: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Map & Side Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Live Map Canvas */}
        <div className="lg:col-span-2 h-[540px] bg-white rounded-xl border border-gray-200 overflow-hidden relative shadow-2xs">
          {API_KEY ? (
            <APIProvider apiKey={API_KEY}>
              <GoogleMap
                defaultCenter={mapCenter}
                defaultZoom={13}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="VOLUNTEER_LIVE_MAP"
                className="w-full h-full"
              >
                {/* Volunteer Current Position Marker */}
                {coords && (
                  <AdvancedMarker position={coords}>
                    <div className="flex flex-col items-center">
                      <div className="size-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white animate-bounce">
                        <Navigation size={12} />
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-900 text-white rounded mt-1 shadow-2xs">
                        You Are Here
                      </span>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Nearest Incident Pin Markers */}
                {visibleIncidents.map((inc) => {
                  if (!inc.latitude || !inc.longitude) return null
                  const isAssisting = assistingIds.includes(inc.id)

                  return (
                    <AdvancedMarker
                      key={inc.id}
                      position={{ lat: inc.latitude, lng: inc.longitude }}
                      onClick={() => setSelectedIncident(inc)}
                    >
                      <div className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                        <div className={`size-8 rounded-full flex items-center justify-center text-white shadow-md border-2 ${
                          isAssisting
                            ? 'bg-emerald-600 border-white'
                            : inc.severity === 'critical'
                            ? 'bg-red-600 border-red-200'
                            : 'bg-amber-600 border-amber-200'
                        }`}>
                          <AlertTriangle size={14} />
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-white text-gray-900 rounded mt-1 border border-gray-200 shadow-2xs">
                          {inc.disaster_type}
                        </span>
                      </div>
                    </AdvancedMarker>
                  )
                })}
              </GoogleMap>
            </APIProvider>
          ) : (
            <LiveTrackingMap
              incidentLat={selectedIncident?.latitude ?? (visibleIncidents[0]?.latitude ?? 14.5772)}
              incidentLng={selectedIncident?.longitude ?? (visibleIncidents[0]?.longitude ?? 123.8854)}
              locationText={selectedIncident?.location_text ?? (visibleIncidents[0]?.location_text ?? 'Cebu Sector')}
              disasterType={selectedIncident?.disaster_type ?? (visibleIncidents[0]?.disaster_type ?? 'Emergency Response')}
              severity={selectedIncident?.severity ?? (visibleIncidents[0]?.severity ?? 'medium')}
              status={selectedIncident && assistingIds.includes(selectedIncident.id) ? 'responding' : 'pending'}
              responder={{
                lat: coords?.lat ?? ((selectedIncident?.latitude ?? 14.5772) - 0.012),
                lng: coords?.lng ?? ((selectedIncident?.longitude ?? 123.8854) - 0.012),
                unitName: 'Volunteer Responder Unit',
                contact: 'RescueLink Live Telemetry',
              }}
            />
          )}
        </div>

        {/* Side Incident Cards List */}
        <div className="flex flex-col gap-3 h-[540px] overflow-y-auto custom-scrollbar">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
            Active Emergency Incidents ({visibleIncidents.length})
          </h2>

          {visibleIncidents.map((inc) => {
            const isAssisting = assistingIds.includes(inc.id)
            const isSelected = selectedIncident?.id === inc.id
            let dist = 1.8
            if (coords && inc.latitude && inc.longitude) {
              dist = getDistanceKm(coords.lat, coords.lng, inc.latitude, inc.longitude)
            }

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 bg-white shadow-2xs ${
                  isSelected
                    ? 'border-red-600 ring-2 ring-red-600/10'
                    : isAssisting
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 rounded border border-red-200">
                    🚨 {inc.disaster_type}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-gray-700">
                    📍 {dist} km
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 leading-snug">{inc.location_text}</h3>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 font-medium">
                    "{inc.raw_message}"
                  </p>
                </div>

                {/* Volunteer Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  {isAssisting ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Volunteered to Assist
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDecision(inc.id, 'assist') }}
                      className="w-full py-1.5 px-3 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <HeartHandshake size={13} /> Assist Mission 🙋‍♂️
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDecision(inc.id, 'ignore') }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="Ignore this incident"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

      </div>

    </div>
  )
}
