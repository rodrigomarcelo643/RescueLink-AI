import { useState } from 'react'
import type { Volunteer } from '@/types/volunteer'
import type { Incident } from '@/types/incident'
import {
  Phone, CheckCircle2, XCircle, Sparkles, Navigation,
  Wrench, Search, Filter, Trash2, Mail
} from 'lucide-react'

interface VolunteersTableProps {
  volunteers: Volunteer[]
  incidents: Incident[]
  onToggleAvailability: (id: string, current: boolean) => void
  onToggleAccountStatus?: (volunteer: Volunteer) => void
  onEdit?: (volunteer: Volunteer) => void
  onDelete?: (volunteer: Volunteer) => void
}

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

function findAIMatchedIncident(
  volunteer: Volunteer,
  incidents: Incident[]
): { ticket: Incident; distanceKm: number; matchReason: string } | null {
  const activeTickets = incidents.filter((i) => i.status === 'pending' || i.status === 'responding')
  if (activeTickets.length === 0) return null

  const volSkills = (volunteer.skills || []).map((s) => s.toLowerCase())
  const volEquip = (volunteer.equipment || []).map((e) => e.toLowerCase())

  let bestMatch: { ticket: Incident; distanceKm: number; matchReason: string } | null = null
  let highestScore = -1

  activeTickets.forEach((ticket) => {
    let score = 0
    let matchReasons: string[] = []

    const disasterType = (ticket.disaster_type || '').toLowerCase()
    const msg = (ticket.raw_message || '').toLowerCase()

    if (disasterType.includes('flood') || msg.includes('baha') || msg.includes('water')) {
      if (volSkills.some((s) => s.includes('boat') || s.includes('rescue') || s.includes('amphibious'))) {
        score += 40
        matchReasons.push('Boat & Flood Rescue')
      }
      if (volEquip.some((e) => e.includes('boat') || e.includes('truck'))) {
        score += 30
        matchReasons.push('Rescue Gear Available')
      }
    }

    if (disasterType.includes('fire') || msg.includes('sunog')) {
      if (volSkills.some((s) => s.includes('fire') || s.includes('rescue') || s.includes('first aid') || s.includes('medical'))) {
        score += 40
        matchReasons.push('Fire Suppression / Medical')
      }
    }

    if (volSkills.some((s) => s.includes('medical') || s.includes('first aid'))) {
      score += 25
      matchReasons.push('First Aid Capability')
    }

    if (ticket.severity === 'critical') score += 20
    if (ticket.severity === 'high') score += 10

    let distanceKm = 1.8
    if (volunteer.latitude && volunteer.longitude && ticket.latitude && ticket.longitude) {
      distanceKm = getDistanceKm(volunteer.latitude, volunteer.longitude, ticket.latitude, ticket.longitude)
      if (distanceKm < 3) score += 30
      else if (distanceKm < 8) score += 15
    }

    if (score > highestScore && score >= 25) {
      highestScore = score
      bestMatch = {
        ticket,
        distanceKm,
        matchReason: matchReasons.join(' + ') || 'Skill & Proximity Match',
      }
    }
  })

  return bestMatch
}

export default function VolunteersTable({
  volunteers,
  incidents,
  onToggleAvailability,
  onToggleAccountStatus,
  onEdit,
  onDelete,
}: VolunteersTableProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'inactive'>('all')

  const filtered = volunteers.filter((v) => {
    const name = (v.profiles?.full_name || '').toLowerCase()
    const phone = (v.profiles?.phone || '').toLowerCase()
    const barangay = (v.profiles?.barangay || '').toLowerCase()
    const skillsStr = (v.skills || []).join(' ').toLowerCase()

    const matchesSearch =
      name.includes(search.toLowerCase()) ||
      phone.includes(search.toLowerCase()) ||
      barangay.includes(search.toLowerCase()) ||
      skillsStr.includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (filterStatus === 'available') return v.is_available
    if (filterStatus === 'inactive') return !v.is_available
    return true
  })

  return (
    <div className="flex flex-col gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      
      {/* Table Toolbar Header */}
      <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-md">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search volunteers by name, barangay, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-red-600 shadow-2xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'all' ? 'bg-gray-900 text-white shadow-2xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({volunteers.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('available')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'available' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            🟢 Available ({volunteers.filter((v) => v.is_available).length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'inactive' ? 'bg-amber-700 text-white shadow-2xs' : 'bg-white border border-gray-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            🔴 Standby ({volunteers.filter((v) => !v.is_available).length})
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/70 border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-500">
              <th className="py-3 px-4">Volunteer Name & Contact</th>
              <th className="py-3 px-4">Login Credentials & Account Status</th>
              <th className="py-3 px-4">GPS Location</th>
              <th className="py-3 px-4">Skills & Capabilities</th>
              <th className="py-3 px-4">Equipment & Gear</th>
              <th className="py-3 px-4">Deployment Status</th>
              <th className="py-3 px-4">AI Proximity Match</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                  No volunteers found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((vol) => {
                const name = vol.profiles?.full_name || 'Anonymous Volunteer'
                const phone = vol.profiles?.phone || 'No phone'
                const barangay = vol.profiles?.barangay || 'Cebu Sector'
                const aiMatch = findAIMatchedIncident(vol, incidents)
                const isDeactivated = vol.account_status === 'deactivated' || vol.profiles?.status === 'deactivated'

                return (
                  <tr key={vol.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Volunteer Identity */}
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xs shrink-0 border border-red-200">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 text-xs">{name}</p>
                          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-gray-400" /> {phone}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5">
                            📍 {barangay}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Login Credentials & Account Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1">
                          <Mail size={11} className="text-gray-400" />
                          {vol.profiles?.email || `${name.toLowerCase().replace(/\s+/g, '')}@rescuelink.ph`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                            isDeactivated
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {isDeactivated ? '🔴 DEACTIVATED' : '🟢 ACTIVE'}
                          </span>
                          
                          {onToggleAccountStatus && (
                            <button
                              type="button"
                              onClick={() => onToggleAccountStatus(vol)}
                              className="text-[10px] font-bold text-gray-500 hover:text-red-700 underline cursor-pointer"
                            >
                              {isDeactivated ? 'Reactivate' : 'Deactivate'}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* GPS Coordinates */}
                    <td className="py-3.5 px-4">
                      {vol.latitude && vol.longitude ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-900 rounded border border-blue-200">
                            <Navigation size={10} className="text-blue-600" /> {vol.latitude.toFixed(4)}, {vol.longitude.toFixed(4)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">Live GPS Connected</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-semibold italic">
                          GPS Location Unset
                        </span>
                      )}
                    </td>

                    {/* Skills Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {vol.skills && vol.skills.length > 0 ? (
                          vol.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-800 rounded border border-red-100"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No skills listed</span>
                        )}
                      </div>
                    </td>

                    {/* Equipment Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {vol.equipment && vol.equipment.length > 0 ? (
                          vol.equipment.map((eq, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-900 rounded border border-purple-100"
                            >
                              {eq}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No gear listed</span>
                        )}
                      </div>
                    </td>

                    {/* Deployment Availability Toggle Switch */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleAvailability(vol.id, vol.is_available)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs ${
                          vol.is_available
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {vol.is_available ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-600" /> 🟢 Ready / Available
                          </>
                        ) : (
                          <>
                            <XCircle size={12} className="text-amber-600" /> 🔴 Standby / Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* AI Proximity Match Recommendation */}
                    <td className="py-3.5 px-4">
                      {aiMatch ? (
                        <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col gap-1 max-w-[220px]">
                          <div className="flex items-center gap-1 text-[10px] font-black text-blue-900">
                            <Sparkles size={12} className="text-blue-600 shrink-0" />
                            <span className="uppercase tracking-wider">AI Skill & GPS Match</span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">
                            Ticket #{aiMatch.ticket.id.slice(0, 8)} ({aiMatch.ticket.disaster_type}) • {aiMatch.distanceKm} km away
                          </p>
                          <span className="text-[9px] font-semibold text-blue-700 bg-white/80 px-1.5 py-0.5 rounded border border-blue-100">
                            💡 {aiMatch.matchReason}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">No active match</span>
                      )}
                    </td>

                    {/* Actions: Edit & Delete CRUD */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(vol)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Volunteer Details"
                          >
                            <Wrench size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(vol)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Inactive / Obsolete Volunteer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
