import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { useIncidents } from '@/hooks/useIncidents'
import MonitoringMapClusters from '@/components/incidents/MonitoringMapClusters'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import type { Incident } from '@/types/incident'
import { X, MapPin, Users, Radio, Shield, Image as ImageIcon, ExternalLink } from 'lucide-react'

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

const SEVERITY_BG: Record<string, string> = {
  low: '#f0fdf4',
  medium: '#fffbeb',
  high: '#fff7ed',
  critical: '#fef2f2',
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

export default function MonitoringMap() {
  const { items, loading } = useIncidents()
  const [selected, setSelected] = useState<Incident | null>(null)
  const [detailedIncident, setDetailedIncident] = useState<Incident | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 10.3157, lng: 123.8854 })

  // Auto-detect user current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {}
      )
    }
  }, [])

  // 1. Hide rescued or closed tickets from monitoring map
  const activeItems = items.filter((i) => i.status !== 'rescued' && i.status !== 'closed')

  const filtered = severityFilter === 'all'
    ? activeItems
    : activeItems.filter((i) => i.severity === severityFilter)

  const counts = {
    low: activeItems.filter((i) => i.severity === 'low').length,
    medium: activeItems.filter((i) => i.severity === 'medium').length,
    high: activeItems.filter((i) => i.severity === 'high').length,
    critical: activeItems.filter((i) => i.severity === 'critical').length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Monitoring Map</h1>
          <p className="mt-0.5 text-sm text-gray-400">Real-time incident clusters and spatial telemetry across active disaster reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/near-incident-live-monitoring"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg transition-colors shadow-2xs"
          >
            <Radio size={13} className="text-purple-700 animate-pulse" /> Live Incident Feed 🛡️
          </Link>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-md">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-green-700">Live Active</span>
          </div>
        </div>
      </div>

      {/* Severity filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeverityFilter('all')}
          className="px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
          style={{
            borderRadius: 5, border: '1px solid',
            borderColor: severityFilter === 'all' ? '#b91c1c' : '#e5e7eb',
            background: severityFilter === 'all' ? '#fef2f2' : '#fff',
            color: severityFilter === 'all' ? '#b91c1c' : '#6b7280',
          }}
        >
          Active Incidents ({activeItems.length})
        </button>
        {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer"
            style={{
              borderRadius: 5, border: '1px solid',
              borderColor: severityFilter === s ? SEVERITY_COLOR[s] : '#e5e7eb',
              background: severityFilter === s ? SEVERITY_BG[s] : '#fff',
              color: severityFilter === s ? SEVERITY_COLOR[s] : '#6b7280',
            }}
          >
            <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Map Canvas */}
      <div className="relative overflow-hidden" style={{ height: 580, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="size-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: '#b91c1c' }} />
          </div>
        )}

        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={mapCenter}
            defaultZoom={12}
            mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rescuelink-map'}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
          >
            <MonitoringMapClusters incidents={filtered} onMarkerClick={setSelected} />
          </Map>
        </APIProvider>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-3"
          style={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <span className="text-[10px] font-black uppercase text-gray-400 mb-0.5">Live Map Telemetry</span>
          {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${s === 'critical' || s === 'high' ? 'animate-pulse' : ''}`} style={{ backgroundColor: SEVERITY_COLOR[s] }} />
              <span className="text-[11px] font-medium capitalize text-gray-700">{s} Severity Alert</span>
            </div>
          ))}
        </div>

        {/* Incident detail popup with proof photo preview & responding agency info */}
        {selected && (
          <div
            className="absolute right-4 top-4 w-84 bg-white p-4 animate-in fade-in duration-200 flex flex-col gap-3"
            style={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-[10px] font-extrabold capitalize"
                  style={{
                    borderRadius: 4,
                    background: SEVERITY_BG[selected.severity],
                    color: SEVERITY_COLOR[selected.severity],
                    border: `1px solid ${SEVERITY_COLOR[selected.severity]}33`,
                  }}
                >
                  {selected.severity}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selected.status}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Proof Multi-Media Preview (Images, Videos, Voice Audio) */}
            {(() => {
              const mediaList = selected.media_urls && selected.media_urls.length > 0
                ? selected.media_urls
                : (selected as any).media_url
                ? [(selected as any).media_url]
                : (selected as any).photo_url
                ? [(selected as any).photo_url]
                : (selected as any).image_url
                ? [(selected as any).image_url]
                : (selected as any).proof_url
                ? [(selected as any).proof_url]
                : []

              const mediaUrl = mediaList[0]
              const videoUrl = (selected as any).video_url || (typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.endsWith('.mov') || mediaUrl.includes('video'))) ? ((selected as any).video_url || mediaUrl) : null
              const audioUrl = (selected as any).audio_url || (typeof mediaUrl === 'string' && (mediaUrl.endsWith('.mp3') || mediaUrl.endsWith('.wav') || mediaUrl.endsWith('.ogg') || mediaUrl.includes('audio') || mediaUrl.includes('voice'))) ? ((selected as any).audio_url || mediaUrl) : null

              if (videoUrl) {
                return (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black">
                    <video src={videoUrl} controls className="w-full max-h-44 object-cover" />
                    <span className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                      🎬 Verified Citizen Video Proof
                    </span>
                  </div>
                )
              }

              if (audioUrl) {
                return (
                  <div className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/90 flex flex-col gap-1.5">
                    <span className="text-[10px] font-extrabold text-purple-900 flex items-center gap-1">
                      🎙️ Citizen Voice Emergency Audio Proof
                    </span>
                    <audio src={audioUrl} controls className="w-full h-8" />
                  </div>
                )
              }

              if (mediaUrl) {
                return (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group">
                    <img
                      src={mediaUrl}
                      alt="Incident Proof"
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                      <ImageIcon size={10} className="text-blue-400" /> Verified Citizen Image Proof ({mediaList.length} attachment{mediaList.length > 1 ? 's' : ''})
                    </span>
                  </div>
                )
              }

              return null
            })()}

            <div>
              <p className="text-sm font-extrabold text-gray-900">{selected.disaster_type}</p>
              {selected.ai_summary && (
                <p className="mt-1 text-[12px] text-gray-600 leading-relaxed line-clamp-2">{selected.ai_summary}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <MapPin size={12} className="text-red-500 shrink-0" />
                <span>{selected.location_text || 'Unknown location'}</span>
              </div>

              {/* Real Assigned Agency Info */}
              <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center gap-2">
                <Shield size={15} className="text-blue-600 shrink-0" />
                <div className="flex flex-col text-[11px]">
                  <span className="font-extrabold text-blue-900">Assigned Response Agency</span>
                  <span className="font-bold text-blue-700">
                    {selected.assigned_agency_name || (selected as any).assigned_agency || (selected as any).agency_name || (selected.disaster_type ? `${selected.disaster_type.toUpperCase()} DISPATCH UNIT` : 'RESPONSE UNIT')}
                  </span>
                </div>
              </div>

              {selected.people_affected && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Users size={11} />
                  {selected.people_affected} people affected
                </div>
              )}

              {/* View Full Details Button */}
              <button
                type="button"
                onClick={() => setDetailedIncident(selected)}
                className="mt-1 w-full py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink size={13} /> View Full Details ↗
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incident Details Modal Window */}
      {detailedIncident && (
        <IncidentDetailsModal
          incident={detailedIncident}
          onClose={() => setDetailedIncident(null)}
        />
      )}
    </div>
  )
}
