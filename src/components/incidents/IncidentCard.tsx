import StatusBadge from '@/components/shared/StatusBadge'
import { SEVERITY_COLOR } from '@/constants/incidentStatus'
import { updateIncidentStatus } from '@/services/incidents.service'
import { updateIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
import type { Incident } from '@/types/incident'
import { MapPin, Users, Clock, Radio, User, ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
}

function LightboxModal({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index)
  const prev = () => setCurrent((c) => (c - 1 + urls.length) % urls.length)
  const next = () => setCurrent((c) => (c + 1) % urls.length)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X size={16} />
        </button>

        {/* Counter */}
        {urls.length > 1 && (
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/60">
            {current + 1} / {urls.length}
          </p>
        )}

        {/* Image */}
        <motion.img
          key={current}
          src={urls[current]}
          alt="proof"
          className="max-h-[80vh] max-w-[90vw] rounded object-contain shadow-2xl"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Prev / Next */}
        {urls.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-14 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function ProofImages({ urls }: { urls: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 self-start text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-600"
        >
          <ImageIcon size={10} />
          {urls.length} proof photo{urls.length > 1 ? 's' : ''} {expanded ? '▲' : '▼'}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="flex flex-wrap gap-1.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {urls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="overflow-hidden transition-opacity hover:opacity-75 focus:outline-none"
                  style={{ borderRadius: 5, border: '1px solid #e5e7eb', width: 64, height: 64 }}
                >
                  <img src={url} alt="proof" className="size-full object-cover" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {lightbox !== null && (
        <LightboxModal urls={urls} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}

export default function IncidentCard({ incident }: { incident: Incident }) {
  const dispatch = useDispatch()

  const handleStatusChange = async (status: Incident['status']) => {
    await updateIncidentStatus(incident.id, status)
    dispatch(updateIncident({ ...incident, status }))
  }

  return (
    <div className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ background: SEVERITY_DOT[incident.severity] ?? '#6b7280' }}
          />
          <div>
            <p className="text-sm font-extrabold capitalize text-gray-900">
              {incident.disaster_type} — {incident.location_text}
            </p>
            {incident.ai_summary && (
              <p className="mt-0.5 text-xs text-gray-400">{incident.ai_summary}</p>
            )}
          </div>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><MapPin size={10} /> {incident.location_text}</span>
        {incident.people_affected && (
          <span className="flex items-center gap-1"><Users size={10} /> {incident.people_affected} affected</span>
        )}
        <span className="flex items-center gap-1"><Radio size={10} /> {incident.channel}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(incident.created_at).toLocaleString()}</span>
        <span className={`font-semibold capitalize ${SEVERITY_COLOR[incident.severity]}`}>{incident.severity}</span>
        {incident.reporter_name && (
          <span className="flex items-center gap-1"><User size={10} /> {incident.reporter_name}</span>
        )}
      </div>

      {/* Proof images */}
      {incident.media_urls?.length > 0 && (
        <ProofImages urls={incident.media_urls} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {(['pending', 'responding', 'rescued', 'closed'] as Incident['status'][])
          .filter((s) => s !== incident.status)
          .map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="px-2.5 py-1 text-xs font-medium capitalize text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              Mark {s}
            </button>
          ))}
      </div>
    </div>
  )
}
