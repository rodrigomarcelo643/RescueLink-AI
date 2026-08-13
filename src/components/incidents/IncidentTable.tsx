import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Incident } from '@/types/incident'
import type { ResponseAgency } from '@/types/responseAgency'
import StatusBadge from '@/components/shared/StatusBadge'
import ProofCarousel from '@/components/incidents/ProofCarousel'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import AgencyAssignModal from '@/components/incidents/AgencyAssignModal'
import { SEVERITY_COLOR } from '@/constants/incidentStatus'
import { assignAgencyToIncident } from '@/services/incidents.service'
import { updateIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
import { useModal } from '@/context/ModalContext'
import { MapPin, Users, Clock, Radio, User, MoreVertical, Eye, Navigation, Building2, Map, Trash2 } from 'lucide-react'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
}

const STATUS_ACTION_LABELS: Record<Incident['status'], string> = {
  pending: 'Set to Pending ⏳',
  responding: 'Set to Responding 🚒',
  rescued: 'Set to Rescued 🟢',
  closed: 'Set to Closed 🔒',
}

interface IncidentTableProps {
  incidents: Incident[]
  onStatusChange: (id: string, status: Incident['status']) => void
  onAssignAgency?: (id: string, agency: ResponseAgency) => void
  onDelete?: (id: string) => void
}

function ActionMenu({
  incidentId,
  currentStatus,
  onStatusChange,
  onViewDetails,
  onViewMap,
  onOpenAssignModal,
  onDelete,
}: {
  incidentId: string
  currentStatus: Incident['status']
  onStatusChange: (status: Incident['status']) => void
  onViewDetails: () => void
  onViewMap: () => void
  onOpenAssignModal: () => void
  onDelete?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { openModal } = useModal()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isClosedOrRescued = currentStatus === 'closed' || currentStatus === 'rescued'
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
            className="absolute right-0 z-40 mt-1 w-48 origin-top-right rounded-md bg-white p-1 shadow-xl border border-gray-200"
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

            {/* Live Track Map Option */}
            <button
              type="button"
              onClick={() => {
                onViewMap()
                setOpen(false)
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded transition-colors flex items-center gap-2"
            >
              <Map size={13} className="text-emerald-600" />
              Live Track Map
            </button>

            {/* Assign Agency Option */}
            {currentStatus !== 'closed' && (
              <button
                type="button"
                onClick={() => {
                  onOpenAssignModal()
                  setOpen(false)
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-2"
              >
                <Navigation size={13} className="text-blue-600" />
                {currentStatus === 'rescued' ? 'Assign/Change Agency' : 'Assign Agency (AI Route)'}
              </button>
            )}

            {!isClosedOrRescued && (
              <>
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
                    {STATUS_ACTION_LABELS[status]}
                  </button>
                ))}
              </>
            )}

            {onDelete && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    openModal({
                      title: 'Delete Incident Ticket',
                      description: 'Are you sure you want to delete this incident report? This action cannot be undone.',
                      icon: <Trash2 size={20} className="text-red-600" />,
                      confirmLabel: 'Delete Ticket',
                      cancelLabel: 'Cancel',
                      danger: true,
                      onConfirm: async () => {
                        await onDelete(incidentId)
                      },
                    })
                    setOpen(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-extrabold text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-2"
                >
                  <Trash2 size={13} className="text-red-600" />
                  Delete Ticket
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function IncidentTable({ incidents, onStatusChange, onAssignAgency, onDelete }: IncidentTableProps) {
  const dispatch = useDispatch()
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [modalTab, setModalTab] = useState<'details' | 'map'>('details')
  const [assignIncident, setAssignIncident] = useState<Incident | null>(null)

  const handleAssignConfirm = async (incidentId: string, agency: ResponseAgency) => {
    await assignAgencyToIncident(incidentId, agency.id, agency.name, agency.username || undefined)
    const target = incidents.find((i) => i.id === incidentId)
    dispatch(updateIncident({
      ...(target || {}),
      id: incidentId,
      assigned_agency_id: agency.id,
      assigned_agency_name: agency.name,
      status: 'pending',
    }))
    if (onAssignAgency) {
      onAssignAgency(incidentId, agency)
    }
  }

  const openDetailsModal = (incident: Incident, tab: 'details' | 'map' = 'details') => {
    setModalTab(tab)
    setSelectedIncident(incident)
  }

  return (
    <>
      <div className="overflow-x-auto bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-gray-50/70" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Incident</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Location</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Severity & Status</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Assigned Unit</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Channel</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">People & Reporter</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Proof Media</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {incidents.map((incident) => {
              // Show assigned unit when name OR id is set (id may be UUID type in DB)
              const assignedName = (incident.assigned_agency_name || null)

              return (
                <tr key={incident.id} className="hover:bg-gray-50/60 transition-colors">
                  
                  {/* Incident & Summary */}
                  <td className="px-4 py-3.5 align-top max-w-[200px]">
                    <div className="flex items-start gap-2 cursor-pointer" onClick={() => openDetailsModal(incident, 'details')}>
                      <span
                        className="mt-1 size-2.5 shrink-0 rounded-full"
                        style={{ background: SEVERITY_DOT[incident.severity] ?? '#6b7280' }}
                      />
                      <div>
                        <p className="text-xs font-extrabold capitalize text-gray-900 leading-tight hover:text-red-700 transition-colors">
                          {incident.disaster_type}
                        </p>
                        {incident.ai_summary ? (
                          <p className="mt-1 text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                            {incident.ai_summary}
                          </p>
                        ) : incident.raw_message ? (
                          <p className="mt-1 text-[11px] text-gray-400 line-clamp-2 italic">
                            "{incident.raw_message}"
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3.5 align-top max-w-[160px]">
                    <div className="flex items-start gap-1.5 text-xs text-gray-700 font-medium">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
                      <span className="line-clamp-2">{incident.location_text}</span>
                    </div>
                  </td>

                  {/* Severity & Status */}
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={incident.status} />
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${SEVERITY_COLOR[incident.severity]}`}>
                        {incident.severity} severity
                      </span>
                    </div>
                  </td>

                  {/* Assigned Agency */}
                  <td className="px-4 py-3.5 align-top max-w-[170px]">
                    {assignedName ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-extrabold text-blue-800 border border-blue-200">
                          <Building2 size={11} className="text-blue-600 shrink-0" />
                          <span className="truncate">{assignedName}</span>
                        </span>
                        {incident.status !== 'closed' && (
                          <button
                            type="button"
                            onClick={() => setAssignIncident(incident)}
                            className="text-[9px] font-extrabold text-blue-600 hover:underline"
                          >
                            Change Agency
                          </button>
                        )}
                      </div>
                    ) : incident.status !== 'closed' ? (
                      <button
                        type="button"
                        onClick={() => setAssignIncident(incident)}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-100"
                      >
                        <Building2 size={10} /> Assign Response Agency
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-semibold italic">Unassigned</span>
                    )}
                  </td>

                  {/* Channel */}
                  <td className="px-4 py-3.5 align-top">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 capitalize">
                      <Radio size={10} />
                      {incident.channel}
                    </span>
                  </td>

                  {/* People & Reporter */}
                  <td className="px-4 py-3.5 align-top max-w-[150px]">
                    <div className="flex flex-col gap-1 text-[11px] text-gray-600">
                      {incident.people_affected !== null && (
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <Users size={11} className="text-gray-400" />
                          {incident.people_affected} affected
                        </span>
                      )}
                      {incident.reporter_name && (
                        <span className="flex items-center gap-1 text-gray-500 truncate">
                          <User size={10} className="text-gray-400 shrink-0" />
                          {incident.reporter_name}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Proof Photos */}
                  <td className="px-4 py-3.5 align-top">
                    <ProofCarousel urls={incident.media_urls ?? []} compact />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 align-top whitespace-nowrap text-[11px] text-gray-400 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(incident.created_at).toLocaleString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>

                  {/* Actions (Three Dots Menu) */}
                  <td className="px-4 py-3.5 align-top text-right">
                    <ActionMenu
                      incidentId={incident.id}
                      currentStatus={incident.status}
                      onStatusChange={(newStatus) => onStatusChange(incident.id, newStatus)}
                      onViewDetails={() => openDetailsModal(incident, 'details')}
                      onViewMap={() => openDetailsModal(incident, 'map')}
                      onOpenAssignModal={() => setAssignIncident(incident)}
                      onDelete={onDelete}
                    />
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Incident Details Modal */}
      <IncidentDetailsModal
        incident={selectedIncident}
        initialTab={modalTab}
        onClose={() => setSelectedIncident(null)}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />

      {/* Manual & AI Agency Assign Modal */}
      {assignIncident && (
        <AgencyAssignModal
          incident={assignIncident}
          onClose={() => setAssignIncident(null)}
          onAssign={handleAssignConfirm}
        />
      )}
    </>
  )
}
