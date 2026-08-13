import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getIncidents, updateIncidentStatus, declineAgencyDispatch } from '@/services/incidents.service'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'
import {
  ShieldCheck, MapPin, CheckCircle,
  Clock, Navigation, RefreshCw, Eye, Sparkles, Filter, ChevronRight,
  Check, X
} from 'lucide-react'
import IncidentDetailsModal from '@/components/incidents/IncidentDetailsModal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'

const SEVERITY_COLOR: Record<Incident['severity'], { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  high:     { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
  medium:   { bg: '#fefce8', text: '#a16207', border: '#fef9c3' },
  low:      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
}

const STATUS_BADGE: Record<Incident['status'], { label: string; bg: string; text: string }> = {
  pending:    { label: 'Pending Dispatch',  bg: '#fef3c7', text: '#b45309' },
  responding: { label: 'En Route / Active',  bg: '#dbeafe', text: '#1d4ed8' },
  rescued:    { label: 'Rescued / Resolved', bg: '#dcfce7', text: '#15803d' },
  closed:     { label: 'Ticket Closed',     bg: '#f3f4f6', text: '#4b5563' },
}

export default function AgencyDashboard() {
  const { agency } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAssignedIncidents = async () => {
    setLoading(true)
    try {
      const all = await getIncidents()
      setIncidents(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignedIncidents()

    // Supabase Realtime — re-fetch from DB on any rescue_tickets change
    const channel = supabase
      .channel(`agency_dashboard_${agency?.id || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => { fetchAssignedIncidents() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agency?.id])

  const agencyCat = agency?.category?.toLowerCase() || ''

  // Pure DB field matching — no localStorage fallbacks
  const assignedIncidents = incidents.filter((inc) => {
    if (!agency) return false
    if (!inc.assigned_agency_id && !inc.assigned_agency_name) return false

    const currentId = agency.id?.toLowerCase().trim() ?? ''
    const currentUsername = (agency.username || '').toLowerCase().trim()
    const currentName = (agency.name || '').toLowerCase().trim()

    // Match by ID
    const targetId = (inc.assigned_agency_id || '').toLowerCase().trim()
    if (targetId && (targetId === currentId || (currentUsername && targetId === currentUsername))) return true

    // Match by name
    const targetName = (inc.assigned_agency_name || '').toLowerCase().trim()
    if (!targetName) return false
    if (targetName === currentName || currentName.includes(targetName) || targetName.includes(currentName)) return true
    if (currentUsername && (targetName.includes(currentUsername) || currentUsername.includes(targetName))) return true

    return false
  })

  const filtered = filterStatus === 'all'
    ? assignedIncidents
    : assignedIncidents.filter((i) => i.status === filterStatus)

  const activeCount = assignedIncidents.filter((i) => i.status === 'responding').length
  const rescuedCount = assignedIncidents.filter((i) => i.status === 'rescued' || i.status === 'closed').length
  const pendingCount = assignedIncidents.filter((i) => i.status === 'pending').length

  const handleUpdateStatus = async (id: string, newStatus: Incident['status']) => {
    setUpdatingId(id)
    try {
      await updateIncidentStatus(id, newStatus)
      setIncidents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeclineDispatch = async (id: string) => {
    setUpdatingId(id)
    try {
      await declineAgencyDispatch(id)
      setIncidents((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6">

      {/* Top Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-gray-900 via-slate-900 to-red-950 text-white rounded-xl shadow-lg border border-gray-800">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 font-extrabold text-xl shrink-0">
            {agencyCat === 'fire' ? '🚒' : agencyCat === 'medical' ? '🚑' : agencyCat === 'police' ? '🚔' : '🌊'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white">{agency?.name || 'Response Agency Unit'}</h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-red-600 text-white">
                {agency?.category || 'Responder'}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1.5">
              <MapPin size={12} className="text-gray-400" />
              {agency?.address || 'Cebu Operational Dispatch Station'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAssignedIncidents}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Dispatches
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <ShieldCheck size={13} className="text-blue-600" /> Assigned Incidents
          </span>
          <p className="text-2xl font-black text-gray-900">{assignedIncidents.length}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock size={13} className="text-amber-600" /> Pending Dispatch
          </span>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
            <Navigation size={13} className="text-blue-600" /> En Route / Responding
          </span>
          <p className="text-2xl font-black text-blue-700">{activeCount}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-2xs flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle size={13} className="text-emerald-600" /> Rescued & Resolved
          </span>
          <p className="text-2xl font-black text-emerald-700">{rescuedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs font-bold shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-gray-400 px-2 flex items-center gap-1">
            <Filter size={11} /> Filter:
          </span>
          {['all', 'pending', 'responding', 'rescued', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded text-xs font-extrabold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-gray-500">
          Showing <strong className="text-gray-900">{filtered.length}</strong> incidents
        </span>
      </div>

      {/* Incident Cards / List */}
      {filtered.length === 0 ? (
        <EmptyState title="No assigned incidents found" description="Your unit has no active incident dispatches under this filter." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((inc) => {
            const sevStyle = SEVERITY_COLOR[inc.severity] ?? SEVERITY_COLOR.medium
            const stBadge = STATUS_BADGE[inc.status] ?? STATUS_BADGE.pending
            const isUpdating = updatingId === inc.id

            return (
              <div
                key={inc.id}
                className="bg-white p-5 rounded-lg border border-gray-200 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-3"
              >
                {/* Card Top Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 text-xs font-black uppercase rounded border"
                      style={{ background: sevStyle.bg, color: sevStyle.text, borderColor: sevStyle.border }}
                    >
                      {inc.severity} priority
                    </span>

                    <span className="text-base font-extrabold text-gray-900 capitalize">
                      {inc.disaster_type} Rescue Request
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full"
                      style={{ background: stBadge.bg, color: stBadge.text }}
                    >
                      {stBadge.label}
                    </span>

                    <span className="text-[11px] font-mono text-gray-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Location & AI Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <div className="flex items-start gap-1.5 text-gray-700 font-bold">
                      <MapPin size={14} className="text-red-600 shrink-0 mt-0.5" />
                      <span>{inc.location_text}</span>
                    </div>

                    {inc.ai_summary && (
                      <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded text-blue-900 text-[11px] font-medium flex items-start gap-1.5 mt-1">
                        <Sparkles size={12} className="text-blue-600 shrink-0 mt-0.5" />
                        <span>"{inc.ai_summary}"</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded border border-gray-200 flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reporter:</span>
                      <span className="font-bold text-gray-800">{inc.reporter_name || 'Anonymous'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contact:</span>
                      <span className="font-bold text-emerald-700 font-mono">{inc.reporter_contact || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">People Affected:</span>
                      <span className="font-bold text-red-700">{inc.people_affected ?? '1+'} persons</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(inc)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <Eye size={13} /> View Full Details & Map <ChevronRight size={13} />
                  </button>

                  <div className="flex items-center gap-2">
                    {inc.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(inc.id, 'responding')}
                          className="px-3 py-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Check size={13} /> {isUpdating ? 'Accepting…' : 'Accept Dispatch 🟢'}
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleDeclineDispatch(inc.id)}
                          className="px-3 py-1.5 text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
                        >
                          <X size={13} /> {isUpdating ? 'Declining…' : 'Decline Dispatch 🔴'}
                        </button>
                      </div>
                    )}

                    {inc.status === 'responding' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(inc.id, 'rescued')}
                        className="px-3 py-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                      >
                        {isUpdating ? 'Updating…' : 'Mark as Rescued / On Scene 🛟'}
                      </button>
                    )}

                    {inc.status === 'rescued' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(inc.id, 'closed')}
                        className="px-3 py-1.5 text-xs font-extrabold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                      >
                        {isUpdating ? 'Updating…' : 'Close Ticket ✓'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* Full Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusChange={(id, st) => {
            handleUpdateStatus(id, st)
          }}
        />
      )}

    </div>
  )
}
