import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/shared/StatusBadge'
import ProofCarousel from '@/components/incidents/ProofCarousel'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import { SEVERITY_COLOR } from '@/constants/incidentStatus'
import { updateIncidentStatus } from '@/services/incidents.service'
import { updateIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
import type { Incident } from '@/types/incident'
import { MapPin, Users, Clock, Radio, User, MoreVertical, Eye } from 'lucide-react'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
}

function ActionMenu({
  currentStatus,
  onStatusChange,
  onViewDetails,
}: {
  currentStatus: Incident['status']
  onStatusChange: (status: Incident['status']) => void
  onViewDetails: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const statuses: Incident['status'][] = ['pending', 'responding', 'rescued', 'closed']
  const available = statuses.filter((s) => s !== currentStatus)

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Actions"
        title="More options"
      >
        <MoreVertical size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-1 w-44 origin-top-right rounded-md bg-white p-1 shadow-xl border border-gray-200"
          >
            {/* View Full Details Option */}
            <button
              type="button"
              onClick={() => {
                onViewDetails()
                setOpen(false)
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center gap-2"
            >
              <Eye size={13} className="text-gray-500" />
              View Full Details
            </button>

            <div className="my-1 border-t border-gray-100" />

            <div className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Set Status
            </div>
            {available.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onStatusChange(status)
                  setOpen(false)
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-semibold capitalize text-gray-700 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
              >
                Mark {status}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function IncidentCard({ incident }: { incident: Incident }) {
  const dispatch = useDispatch()
  const [showModal, setShowModal] = useState(false)

  const handleStatusChange = async (status: Incident['status']) => {
    await updateIncidentStatus(incident.id, status)
    dispatch(updateIncident({ ...incident, status }))
  }

  return (
    <>
      <div className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>

        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 cursor-pointer" onClick={() => setShowModal(true)}>
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full"
              style={{ background: SEVERITY_DOT[incident.severity] ?? '#6b7280' }}
            />
            <div>
              <p className="text-sm font-extrabold capitalize text-gray-900 hover:text-red-700 transition-colors">
                {incident.disaster_type} — {incident.location_text}
              </p>
              {incident.ai_summary && (
                <p className="mt-0.5 text-xs text-gray-400">{incident.ai_summary}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={incident.status} />
            <ActionMenu
              currentStatus={incident.status}
              onStatusChange={handleStatusChange}
              onViewDetails={() => setShowModal(true)}
            />
          </div>
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
          <div className="pt-1">
            <ProofCarousel urls={incident.media_urls} />
          </div>
        )}
      </div>

      {showModal && (
        <IncidentDetailsModal
          incident={incident}
          onClose={() => setShowModal(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  )
}
