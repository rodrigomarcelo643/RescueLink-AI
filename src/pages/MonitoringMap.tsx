import { useState } from 'react'
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { useIncidents } from '@/hooks/useIncidents'
import MonitoringMapClusters from '@/components/incidents/MonitoringMapClusters'
import type { Incident } from '@/types/incident'
import { X, AlertTriangle, MapPin, Users } from 'lucide-react'

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
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const filtered = severityFilter === 'all'
    ? items
    : items.filter((i) => i.severity === severityFilter)

  const counts = {
    low: items.filter((i) => i.severity === 'low').length,
    medium: items.filter((i) => i.severity === 'medium').length,
    high: items.filter((i) => i.severity === 'high').length,
    critical: items.filter((i) => i.severity === 'critical').length,
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Monitoring Map</h1>
          <p className="mt-0.5 text-sm text-gray-400">Real-time incident clusters across all areas</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-gray-400">Live</span>
        </div>
      </div>

      {/* Severity filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeverityFilter('all')}
          className="px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            borderRadius: 5, border: '1px solid',
            borderColor: severityFilter === 'all' ? '#b91c1c' : '#e5e7eb',
            background: severityFilter === 'all' ? '#fef2f2' : '#fff',
            color: severityFilter === 'all' ? '#b91c1c' : '#6b7280',
          }}
        >
          All ({items.length})
        </button>
        {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
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

      {/* Map */}
      <div className="relative overflow-hidden" style={{ height: 560, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <div className="size-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: '#b91c1c' }} />
          </div>
        )}

        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={{ lat: 10.3157, lng: 123.8854 }}
            defaultZoom={11}
            mapId="rescuelink-monitoring"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
          >
            <MonitoringMapClusters incidents={filtered} onMarkerClick={setSelected} />
          </Map>
        </APIProvider>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-white p-3"
          style={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
              <span className="text-[11px] font-medium capitalize text-gray-600">{s}</span>
            </div>
          ))}
        </div>

        {/* Incident detail popup */}
        {selected && (
          <div
            className="absolute right-4 top-4 w-72 bg-white p-4"
            style={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          >
            <div className="flex items-start justify-between gap-2">
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
                <span className="text-[11px] font-semibold capitalize text-gray-500">{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            <p className="mt-2 text-sm font-extrabold text-gray-900">{selected.disaster_type}</p>

            {selected.ai_summary && (
              <p className="mt-1 text-[12px] text-gray-500 line-clamp-3">{selected.ai_summary}</p>
            )}

            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <MapPin size={11} />
                {selected.location_text || 'Unknown location'}
              </div>
              {selected.people_affected && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Users size={11} />
                  {selected.people_affected} people affected
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <AlertTriangle size={11} />
                {selected.channel}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
