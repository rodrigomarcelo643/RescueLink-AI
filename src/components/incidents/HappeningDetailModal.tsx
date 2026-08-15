import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Incident } from '@/types/incident'
import type { PublicHappening } from '@/services/aiPredictionService'
import { haversineKm, formatDistance, getCompassDirection } from '@/services/aiPredictionService'
import {
  X, MapPin, Users, Navigation,
  Clock, Share2, CheckCircle2, ShieldAlert,
  ExternalLink, Sparkles, Image as ImageIcon
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  item: Incident | PublicHappening | null
  userCoords?: { lat: number; lng: number } | null
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: 'bg-green-100', color: 'text-green-800', label: 'Low Severity' },
  medium: { bg: 'bg-amber-100', color: 'text-amber-800', label: 'Medium Severity' },
  high: { bg: 'bg-orange-100', color: 'text-orange-800', label: 'High Severity' },
  critical: { bg: 'bg-red-100', color: 'text-red-800', label: 'CRITICAL SEVERITY' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'bg-amber-50', color: 'text-amber-700', label: 'Pending Dispatch' },
  responding: { bg: 'bg-blue-50', color: 'text-blue-700', label: 'Responders En Route' },
  rescued: { bg: 'bg-green-50', color: 'text-green-700', label: 'Operation Resolved' },
  closed: { bg: 'bg-gray-100', color: 'text-gray-600', label: 'Closed' },
}

export default function HappeningDetailModal({ open, onClose, item, userCoords }: Props) {
  const [copied, setCopied] = useState(false)
  const [activeMedia, setActiveMedia] = useState<string | null>(null)

  if (!open || !item) return null

  // Normalize item properties whether it's an Incident or PublicHappening
  const isHappening = 'badgeText' in item
  const incidentObj = !isHappening ? (item as Incident) : null
  const happeningObj = isHappening ? (item as PublicHappening) : null

  const title = incidentObj
    ? `${incidentObj.disaster_type.toUpperCase()} Emergency`
    : happeningObj?.title ?? 'Disaster Happening Detail'

  const locationText = incidentObj ? incidentObj.location_text : happeningObj?.locationText ?? 'Unknown Location'
  const lat = incidentObj ? incidentObj.latitude : happeningObj?.latitude ?? null
  const lng = incidentObj ? incidentObj.longitude : happeningObj?.longitude ?? null
  const severity = incidentObj ? incidentObj.severity : happeningObj?.severity ?? 'medium'
  const status = incidentObj ? incidentObj.status : 'pending'
  const timestamp = incidentObj ? incidentObj.created_at : happeningObj?.timestamp ?? new Date().toISOString()
  const summary = incidentObj
    ? incidentObj.ai_summary || incidentObj.raw_message || 'Emergency ticket registered.'
    : happeningObj?.summary ?? 'No summary available.'

  const mediaUrls = incidentObj?.media_urls ?? []
  const peopleAffected = incidentObj?.people_affected ?? (happeningObj?.details?.peopleAffected as number | undefined)
  const assignedAgency = incidentObj?.assigned_agency_name ?? (happeningObj?.details?.assignedAgency as string | undefined)

  // Distance calculation
  let distanceText: string | null = null
  let directionText: string | null = null
  if (userCoords && lat && lng) {
    const distKm = haversineKm(userCoords.lat, userCoords.lng, lat, lng)
    distanceText = formatDistance(distKm)
    directionText = getCompassDirection(userCoords.lat, userCoords.lng, lat, lng)
  }

  const handleShare = () => {
    const shareText = `[RescueLink AI Alert] ${title} at ${locationText}. Status: ${status.toUpperCase()}. Severity: ${severity.toUpperCase()}. Details: ${summary}`
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const sevCfg = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.medium
  const statCfg = STATUS_STYLE[status] ?? STATUS_STYLE.pending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-gray-100 bg-gray-50/80">
          <div className="flex flex-col gap-1.5 pr-3 sm:pr-6 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase rounded ${sevCfg.bg} ${sevCfg.color}`}>
                {sevCfg.label}
              </span>
              <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded ${statCfg.bg} ${statCfg.color}`}>
                {statCfg.label}
              </span>
              {distanceText && (
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold bg-blue-100 text-blue-800 rounded truncate max-w-[200px] sm:max-w-none">
                  📍 {distanceText} {directionText} from you
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight mt-1 leading-snug break-words">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-600 font-medium flex items-center gap-1 min-w-0">
              <MapPin size={13} className="text-red-600 shrink-0" />
              <span className="truncate">{locationText}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex flex-col gap-3.5 sm:gap-4 text-xs font-sans">
          
          {/* AI Summary / Description Box */}
          <div className="p-3 sm:p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-purple-900 mb-1">
              <Sparkles size={14} className="text-purple-600 shrink-0" />
              AI Intelligence & Event Summary
            </div>
            <p className="text-[11px] sm:text-xs text-purple-950 font-medium leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Key Incident Telemetry Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-150 flex flex-col gap-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-400">People Affected</span>
              <span className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-1.5">
                <Users size={14} className="text-red-600 shrink-0" />
                {peopleAffected ? `${peopleAffected} people` : 'Unspecified'}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-150 flex flex-col gap-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-400">Assigned Response</span>
              <span className="text-xs font-black text-gray-900 flex items-center gap-1 truncate">
                <Navigation size={13} className="text-blue-600 shrink-0" />
                <span className="truncate">{assignedAgency || 'Pending Station Matching'}</span>
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-150 flex flex-col gap-1 xs:col-span-2 sm:col-span-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-400">Reported Time</span>
              <span className="text-xs font-black text-gray-900 flex items-center gap-1">
                <Clock size={13} className="text-purple-600 shrink-0" />
                {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Coordinates & Technical Meta */}
          {lat && lng && (
            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-gray-500 shrink-0" />
                <div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-400 block">GPS Coordinates</span>
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-gray-800">
                    {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
                  </span>
                </div>
              </div>
              <a
                href={`https://maps.google.com/?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 shrink-0"
              >
                Open Google Maps <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Proof Media Gallery */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <ImageIcon size={12} /> Citizen Proof Media ({mediaUrls.length})
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {mediaUrls.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveMedia(url)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-900 group cursor-pointer"
                  >
                    <img src={url} alt={`Proof ${i + 1}`} className="size-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Image Modal Overlay */}
          {activeMedia && (
            <div
              className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setActiveMedia(null)}
            >
              <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl">
                <img src={activeMedia} alt="Enlarged media proof" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
                <button
                  onClick={() => setActiveMedia(null)}
                  className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
          <button
            onClick={handleShare}
            className="w-full sm:w-auto px-4 py-2 text-xs font-extrabold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Share Alert'}</span>
          </button>

          {incidentObj && (
            <Link
              to={`/track/${incidentObj.id}`}
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <Navigation size={14} />
              <span>Track Live Response 🚨</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
