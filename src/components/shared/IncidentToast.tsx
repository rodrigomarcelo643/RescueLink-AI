import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Incident } from '@/types/incident'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import { matchNearestAgency, type AgencyMatchResult } from '@/services/agencyMatcher.service'
import {
  ShieldAlert, AlertTriangle, Info, CheckCircle,
  MapPin, Users, X, Eye, Clock, Phone, Sparkles, Send
} from 'lucide-react'

export interface ToastItem {
  id: string
  incident: Incident
  timestamp: string
}

const SEVERITY_CONFIG: Record<
  Incident['severity'],
  {
    bg: string
    border: string
    badgeBg: string
    badgeText: string
    icon: typeof ShieldAlert
    ring: string
    label: string
  }
> = {
  critical: {
    bg: 'bg-red-950/95 text-white',
    border: 'border-red-600',
    badgeBg: 'bg-red-600 text-white',
    badgeText: 'CRITICAL ALERT',
    icon: ShieldAlert,
    ring: 'ring-2 ring-red-500 animate-pulse',
    label: 'CRITICAL',
  },
  high: {
    bg: 'bg-orange-950/95 text-white',
    border: 'border-orange-500',
    badgeBg: 'bg-orange-500 text-white',
    badgeText: 'HIGH ALERT',
    icon: AlertTriangle,
    ring: 'ring-1 ring-orange-400',
    label: 'HIGH',
  },
  medium: {
    bg: 'bg-amber-950/95 text-white',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500 text-black font-bold',
    badgeText: 'MEDIUM ALERT',
    icon: Info,
    ring: '',
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-emerald-950/95 text-white',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-600 text-white',
    badgeText: 'LOW ALERT',
    icon: CheckCircle,
    ring: '',
    label: 'LOW',
  },
}

function playAlertSound(severity: Incident['severity']) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = severity === 'critical' ? 'sawtooth' : 'sine'
    osc.frequency.setValueAtTime(severity === 'critical' ? 880 : severity === 'high' ? 660 : 440, ctx.currentTime)

    if (severity === 'critical') {
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    console.log('Audio sound alert prevented by browser policy:', e)
  }
}

interface SingleToastCardProps {
  toast: ToastItem
  onDismiss: (id: string) => void
  onSelectIncident: (inc: Incident) => void
  onStatusChange?: (id: string, status: Incident['status']) => void
}

function SingleToastCard({ toast, onDismiss, onSelectIncident, onStatusChange }: SingleToastCardProps) {
  const { id, incident, timestamp } = toast
  const config = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium
  const Icon = config.icon

  const [agencyMatch, setAgencyMatch] = useState<AgencyMatchResult | null>(null)
  const [dispatched, setDispatched] = useState(false)

  useEffect(() => {
    matchNearestAgency(incident).then((res) => setAgencyMatch(res))
  }, [incident])

  const handleDispatch = () => {
    setDispatched(true)
    if (onStatusChange) {
      onStatusChange(incident.id, 'responding')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 60 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`pointer-events-auto relative overflow-hidden rounded-lg p-4 shadow-2xl border ${config.bg} ${config.border} ${config.ring} backdrop-blur-md flex flex-col gap-2.5`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-white/10 shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${config.badgeBg}`}>
              {config.badgeText}
            </span>
            <h4 className="mt-1 text-sm font-extrabold capitalize text-white leading-tight">
              {incident.disaster_type} — {incident.location_text}
            </h4>
          </div>
        </div>

        <button
          onClick={() => onDismiss(id)}
          className="flex size-6 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* AI Summary */}
      {incident.ai_summary && (
        <p className="text-xs font-medium text-white/90 leading-relaxed line-clamp-2 bg-black/25 p-2 rounded border border-white/10">
          {incident.ai_summary}
        </p>
      )}

      {/* 🤖 AI Assigned Agency Box */}
      {agencyMatch && (
        <div className="rounded-md bg-blue-950/80 p-2.5 border border-blue-400/30 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-300 tracking-wider">
              <Sparkles size={11} className="text-blue-400" /> AI Assigned Agency (Cebu)
            </span>
            <span className="text-[10px] font-bold text-emerald-300">
              {agencyMatch.distanceKm} km away
            </span>
          </div>

          <p className="text-xs font-extrabold text-white leading-tight">
            {agencyMatch.agency.name}
          </p>

          <div className="flex items-center justify-between gap-2 text-[10px] text-blue-200/80 pt-0.5">
            <span className="flex items-center gap-1 font-semibold truncate">
              <Phone size={10} /> {agencyMatch.agency.contacts?.[0]?.value || 'Hotline 911'}
            </span>
            <span className="text-emerald-300 font-bold">
              ETA ~{agencyMatch.estimatedTimeMin} mins
            </span>
          </div>

          {/* Quick Dispatch Button */}
          <button
            type="button"
            onClick={handleDispatch}
            disabled={dispatched || incident.status === 'responding'}
            className={`mt-1 flex items-center justify-center gap-1.5 w-full py-1 text-xs font-extrabold rounded transition-all shadow-xs ${
              dispatched || incident.status === 'responding'
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Send size={11} />
            {dispatched || incident.status === 'responding' ? '✓ Agency Dispatched En Route' : 'Dispatch Agency Now'}
          </button>
        </div>
      )}

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/70 border-t border-white/10 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold">
            <MapPin size={11} className="text-white/80" />
            {incident.location_text}
          </span>
          {incident.people_affected !== null && (
            <span className="flex items-center gap-1 font-semibold text-white/90">
              <Users size={11} />
              {incident.people_affected} affected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-white/60">
          <Clock size={10} />
          {timestamp}
        </div>
      </div>

      {/* Toast Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onSelectIncident(incident)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded transition-colors"
        >
          <Eye size={12} /> View Full Details
        </button>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="px-2.5 py-1 text-xs font-medium text-white/70 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}

interface IncidentToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  onStatusChange?: (id: string, status: Incident['status']) => void
}

export default function IncidentToast({ toasts, onDismiss, onStatusChange }: IncidentToastProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  // Play audio alert sound when new toast is pushed
  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1]
      playAlertSound(latest.incident.severity)
    }
  }, [toasts.length])

  return (
    <>
      {/* Toast Container Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <SingleToastCard
              key={toast.id}
              toast={toast}
              onDismiss={onDismiss}
              onSelectIncident={setSelectedIncident}
              onStatusChange={onStatusChange}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Incident Full Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={onStatusChange}
        />
      )}
    </>
  )
}
