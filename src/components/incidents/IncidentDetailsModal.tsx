import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Incident } from '@/types/incident'
import StatusBadge from '@/components/shared/StatusBadge'
import ProofCarousel from '@/components/incidents/ProofCarousel'
import LiveTrackingMap from '@/components/incidents/LiveTrackingMap'
import { SEVERITY_COLOR } from '@/constants/incidentStatus'
import { matchNearestAgency, type AgencyMatchResult } from '@/services/agencyMatcher.service'
import {
  X, MapPin, Users, Clock, Radio, User, Phone,
  AlertTriangle, ShieldAlert, FileText, Sparkles, Send, Building2, Navigation
} from 'lucide-react'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
}

interface IncidentDetailsModalProps {
  incident: Incident | null
  onClose: () => void
  onStatusChange?: (id: string, status: Incident['status']) => void
  initialTab?: 'details' | 'map'
}

export default function IncidentDetailsModal({
  incident,
  onClose,
  onStatusChange,
  initialTab = 'details',
}: IncidentDetailsModalProps) {
  const [agencyMatch, setAgencyMatch] = useState<AgencyMatchResult | null>(null)
  const [dispatched, setDispatched] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'map'>(initialTab)

  useEffect(() => {
    if (!incident) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    // Compute AI agency match
    matchNearestAgency(incident).then((res) => setAgencyMatch(res))

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [incident, onClose])

  if (!incident) return null

  const incLat = incident.latitude ?? 14.5772
  const incLng = incident.longitude ?? 121.1234

  const responderInfo = {
    lat: incLat + 0.014,
    lng: incLng - 0.016,
    unitName: agencyMatch?.agency.name || 'BFP Labangon Fire Sub-Station 🚒',
    contact: agencyMatch?.agency.contacts?.[0]?.value || '(032) 261-2222',
  }

  const handleDispatch = () => {
    setDispatched(true)
    if (onStatusChange) {
      onStatusChange(incident.id, 'responding')
    }
  }

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-2xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="size-3 rounded-full"
                style={{ background: SEVERITY_DOT[incident.severity] ?? '#6b7280' }}
              />
              <div>
                <h2 className="text-base font-extrabold text-gray-900 capitalize">
                  {incident.disaster_type} Incident Report
                </h2>
                <p className="text-xs text-gray-400 font-mono">ID: {incident.id}</p>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-gray-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                    activeTab === 'details' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Full Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded transition-all ${
                    activeTab === 'map' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Navigation size={12} /> Live Map
                </button>
              </div>

              <StatusBadge status={incident.status} />
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex flex-col gap-5 p-6">

            {/* 🗺️ Embedded Live Tracking Map */}
            {activeTab === 'map' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Navigation size={13} className="text-blue-600" />
                    Live Google Maps Driving Route Navigation
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    Live GPS Telemetry Active
                  </span>
                </div>

                <LiveTrackingMap
                  incidentLat={incLat}
                  incidentLng={incLng}
                  disasterType={incident.disaster_type}
                  locationText={incident.location_text}
                  severity={incident.severity}
                  status={incident.status}
                  responder={incident.status === 'responding' ? responderInfo : null}
                />
              </div>
            ) : (
              <>
                {/* 🗺️ Small Live Map Banner in Details View */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-white text-xs">
                    <span className="font-extrabold flex items-center gap-1.5 text-blue-300">
                      <Navigation size={13} /> Live Incident & Responder Map
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('map')}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline"
                    >
                      Expand Interactive Map →
                    </button>
                  </div>
                  <LiveTrackingMap
                    incidentLat={incLat}
                    incidentLng={incLng}
                    disasterType={incident.disaster_type}
                    locationText={incident.location_text}
                    severity={incident.severity}
                    status={incident.status}
                    responder={incident.status === 'responding' ? responderInfo : null}
                  />
                </div>

                {/* AI Summary Banner */}
                {incident.ai_summary && (
                  <div className="rounded-md bg-red-50/70 p-4 border border-red-100">
                    <div className="flex items-center gap-2 text-red-800 font-extrabold text-xs uppercase tracking-wide">
                      <AlertTriangle size={14} className="text-red-700" />
                      AI Incident Analysis Summary
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-gray-800 leading-relaxed">
                      {incident.ai_summary}
                    </p>
                  </div>
                )}

                {/* 🤖 AI Assigned Agency Card (Cebu City & Labangon) */}
                {agencyMatch && (
                  <div className="rounded-lg bg-blue-50/80 p-4 border border-blue-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-900 tracking-wider">
                        <Sparkles size={14} className="text-blue-600" /> AI Assigned Response Agency (Cebu)
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-600 text-white rounded">
                        {agencyMatch.distanceKm} km away
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0 shadow-xs">
                        <Building2 size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-extrabold text-gray-900">
                          {agencyMatch.agency.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {agencyMatch.agency.address ?? 'Cebu City Emergency Station'}
                        </p>
                        <p className="text-[11px] text-blue-700 mt-1 font-semibold">
                          {agencyMatch.aiReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/60 text-xs">
                      <div className="flex items-center gap-3 text-gray-700">
                        <span className="flex items-center gap-1 font-bold">
                          <Phone size={12} className="text-blue-600" />
                          {agencyMatch.agency.contacts?.[0]?.value || 'Hotline 911'}
                        </span>
                        <span className="text-emerald-700 font-extrabold">
                          Estimated ETA: ~{agencyMatch.estimatedTimeMin} mins
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleDispatch}
                        disabled={dispatched || incident.status === 'responding'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-md transition-all shadow-xs ${
                          dispatched || incident.status === 'responding'
                            ? 'bg-emerald-600 text-white cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Send size={12} />
                        {dispatched || incident.status === 'responding' ? '✓ Agency Dispatched En Route' : 'Dispatch Agency Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Raw Message */}
                {incident.raw_message && (
                  <div className="flex flex-col gap-1.5 rounded-md bg-gray-50 p-4 border border-gray-200">
                    <div className="flex items-center gap-1.5 text-gray-500 font-semibold text-[11px] uppercase tracking-wide">
                      <FileText size={12} /> Reported Citizen Message
                    </div>
                    <p className="text-xs text-gray-700 italic leading-relaxed">
                      "{incident.raw_message}"
                    </p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* Location */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <MapPin size={16} className="mt-0.5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">Location</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{incident.location_text}</p>
                      {incident.latitude && incident.longitude && (
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          GPS: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Severity & Score */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <ShieldAlert size={16} className="mt-0.5 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">Severity & Priority</p>
                      <p className={`font-extrabold capitalize mt-0.5 ${SEVERITY_COLOR[incident.severity]}`}>
                        {incident.severity} Severity
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-semibold">
                        Priority Score: <span className="text-gray-900 font-bold">{incident.priority_score ?? 0}</span>
                      </p>
                    </div>
                  </div>

                  {/* People Affected */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <Users size={16} className="mt-0.5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">People Affected</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {incident.people_affected !== null ? `${incident.people_affected} individuals` : 'Unspecified'}
                      </p>
                    </div>
                  </div>

                  {/* Channel */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <Radio size={16} className="mt-0.5 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">Reporting Channel</p>
                      <p className="font-semibold text-gray-800 capitalize mt-0.5">{incident.channel}</p>
                    </div>
                  </div>

                  {/* Reporter Info */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <User size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">Reporter Contact</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {incident.reporter_name ?? 'Anonymous'}
                      </p>
                      {incident.reporter_contact && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {incident.reporter_contact}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-gray-50/50 p-3">
                    <Clock size={16} className="mt-0.5 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-gray-400">Timestamp</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {new Date(incident.created_at).toLocaleString('en-PH')}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Media / Proof Photos */}
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-2">
                    Proof Photos & Media Attachments ({incident.media_urls?.length ?? 0})
                  </p>
                  {incident.media_urls && incident.media_urls.length > 0 ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 flex justify-center">
                      <ProofCarousel urls={incident.media_urls} />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No proof photos attached.</p>
                  )}
                </div>
              </>
            )}

            {/* Status Change Bar */}
            {onStatusChange && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 mt-2">
                <span className="text-xs font-semibold text-gray-500">Update Ticket Status:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['pending', 'responding', 'rescued', 'closed'] as Incident['status'][])
                    .filter((s) => s !== incident.status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onStatusChange(incident.id, s)
                          onClose()
                        }}
                        className="px-3 py-1.5 text-xs font-extrabold capitalize text-gray-700 bg-gray-50 hover:bg-red-50 hover:text-red-700 transition-colors border border-gray-200 rounded-md"
                      >
                        Mark {s}
                      </button>
                    ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
