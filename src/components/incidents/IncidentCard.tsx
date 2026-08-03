import StatusBadge from '@/components/shared/StatusBadge'
import { SEVERITY_COLOR } from '@/constants/incidentStatus'
import { updateIncidentStatus } from '@/services/incidents.service'
import { updateIncident } from '@/redux/slices/incidentSlice'
import { useDispatch } from 'react-redux'
import type { Incident } from '@/types/incident'
import { MapPin, Users, Clock, Radio } from 'lucide-react'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#b91c1c',
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
      </div>

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
