import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  getIncidents,
  updateIncidentStatus,
  declineAgencyDispatch,
  assignAgencyToIncident,
} from '@/services/incidents.service'
import { matchNearestAgency, type AgencyMatchResult } from '@/services/agencyMatcher.service'
import { getResponseAgencies } from '@/services/responseAgencies.service'
import { supabase } from '@/services/supabase'
import type { Incident } from '@/types/incident'
import {
  ShieldCheck, MapPin, CheckCircle, Building2,
  Clock, Navigation, RefreshCw, Eye, Sparkles, Filter, ChevronRight,
  X, Zap
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

interface NearestAlertItem {
  incident: Incident
  matchResult: AgencyMatchResult
}

export default function AgencyDashboard() {
  const { agency } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [nearestAlerts, setNearestAlerts] = useState<NearestAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchAssignedIncidents = useCallback(async (isInitial = false) => {
    if (isInitial && incidents.length === 0) setLoading(true)
    try {
      const rawAll = await getIncidents()

      // 1. Strict Deduplication by Ticket ID
      const uniqueMap = new Map<string, Incident>()
      rawAll.forEach((item) => {
        if (item && item.id) {
          uniqueMap.set(item.id, item)
        }
      })
      const all = Array.from(uniqueMap.values())
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setIncidents(all)

      setLoading(false)

      if (agency) {
        const allAgencies = await getResponseAgencies()

        // REQUIREMENT: AI Nearest Station Alert MUST ONLY show PENDING, UNRESOLVED tickets!
        // Closed, Rescued, or Responding tickets are NEVER shown in AI Nearest Station Alerts!
        const pendingTickets = all.filter((i) => i.status === 'pending')

        const curId = (agency.id || '').toLowerCase().trim()
        const curUsername = (agency.username || '').toLowerCase().trim()
        const curEmail = (agency.email || '').toLowerCase().trim()
        const curName = (agency.name || '').toLowerCase().trim()

        const results = await Promise.all(
          pendingTickets.map(async (inc) => {
            const res = await matchNearestAgency(inc, allAgencies)
            return { inc, res }
          })
        )

        // 2. Strict Deduplication of Nearest Station Alerts (by ID and content fingerprint)
        const alertMap = new Map<string, NearestAlertItem>()
        const seenFingerprints = new Set<string>()

        for (const { inc, res } of results) {
          if (!inc || !inc.id || alertMap.has(inc.id)) continue
          if (inc.status === 'closed' || inc.status === 'rescued' || inc.status === 'responding') continue

          // Deduplicate test report spam with identical location & message
          const fingerprint = `${(inc.location_text || '').toLowerCase().trim()}_${(inc.raw_message || '').toLowerCase().slice(0, 30).trim()}`
          if (seenFingerprints.has(fingerprint)) continue

          const targetId = (res.agency.id || '').toLowerCase().trim()
          const targetUsername = (res.agency.username || '').toLowerCase().trim()
          const targetEmail = (res.agency.email || '').toLowerCase().trim()
          const targetName = (res.agency.name || '').toLowerCase().trim()

          const isMatched =
            (curId && targetId && curId === targetId) ||
            (curUsername && targetUsername && curUsername === targetUsername) ||
            (curEmail && targetEmail && curEmail === targetEmail) ||
            (curName && targetName && (curName.includes(targetName) || targetName.includes(curName)))

          if (isMatched) {
            seenFingerprints.add(fingerprint)
            alertMap.set(inc.id, {
              incident: inc,
              matchResult: res,
            })
          }
        }

        const matchedItems = Array.from(alertMap.values())
        matchedItems.sort((a, b) => new Date(b.incident.created_at).getTime() - new Date(a.incident.created_at).getTime())
        setNearestAlerts(matchedItems)
      }
    } catch (e) {
      console.error('AgencyDashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [agency?.id])

  useEffect(() => {
    fetchAssignedIncidents(true)

    const channelName = `agency_dash_tickets_${agency?.id || 'all'}_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => { fetchAssignedIncidents(false) }
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [agency?.id, fetchAssignedIncidents])

  const agencyCat = agency?.category?.toLowerCase() || ''

  // Filter assigned incidents for bottom list:
  // Shows tickets explicitly assigned to this station, OR active responding/rescued/closed tickets
  const assignedIncidentsMap = new Map<string, Incident>()

  incidents.forEach((inc) => {
    if (!agency || !inc || !inc.id) return

    const currentId = agency.id?.toLowerCase().trim() ?? ''
    const currentUsername = (agency.username || '').toLowerCase().trim()
    const currentEmail = (agency.email || '').toLowerCase().trim()
    const currentName = (agency.name || '').toLowerCase().trim()

    // 1. Explicit DB assignment match
    const targetId = (inc.assigned_agency_id || '').toLowerCase().trim()
    if (targetId && (targetId === currentId || (currentUsername && targetId === currentUsername) || (currentEmail && targetId === currentEmail))) {
      assignedIncidentsMap.set(inc.id, inc)
      return
    }

    const targetName = (inc.assigned_agency_name || '').toLowerCase().trim()
    if (targetName && (targetName === currentName || currentName.includes(targetName) || targetName.includes(currentName))) {
      assignedIncidentsMap.set(inc.id, inc)
      return
    }

    // 2. Active responding/rescued/closed tickets for this station category
    const incCategory = (inc.disaster_type || '').toLowerCase()
    const stationCategory = (agency.category || '').toLowerCase()
    const isCategoryMatch =
      (stationCategory === 'fire' && incCategory.includes('fire')) ||
      (stationCategory === 'medical' && (incCategory.includes('medical') || incCategory.includes('injury'))) ||
      (stationCategory === 'police' && incCategory.includes('police')) ||
      (stationCategory === 'rescue' && (incCategory.includes('flood') || incCategory.includes('landslide') || incCategory.includes('earthquake') || incCategory.includes('typhoon')))

    if (isCategoryMatch && (inc.status === 'responding' || inc.status === 'rescued' || inc.status === 'closed')) {
      assignedIncidentsMap.set(inc.id, inc)
    }
  })

  const assignedIncidents = Array.from(assignedIncidentsMap.values())
  assignedIncidents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered = filterStatus === 'all'
    ? assignedIncidents
    : assignedIncidents.filter((i) => i.status === filterStatus)

  const activeCount = assignedIncidents.filter((i) => i.status === 'responding').length
  const rescuedCount = assignedIncidents.filter((i) => i.status === 'rescued' || i.status === 'closed').length
  const pendingCount = assignedIncidents.filter((i) => i.status === 'pending').length

  const handleUpdateStatus = async (id: string, newStatus: Incident['status']) => {
    setUpdatingId(id)
    try {
      if (agency && (newStatus === 'responding' || newStatus === 'pending')) {
        // Automatically persist assigned_agency_id, assigned_agency_name, and status in DB
        await assignAgencyToIncident(
          id,
          agency.id,
          agency.name,
          agency.username || undefined,
          newStatus
        )
      } else {
        await updateIncidentStatus(id, newStatus)
      }

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                assigned_agency_id: agency?.id || item.assigned_agency_id,
                assigned_agency_name: agency?.name || item.assigned_agency_name,
                assigned_responder_id: agency?.id || item.assigned_responder_id,
              }
            : item
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleImmediateAction = async (incidentId: string) => {
    if (!agency) return
    setUpdatingId(incidentId)
    try {
      // Assign ticket to current agency AND set status to responding in Supabase DB
      await assignAgencyToIncident(
        incidentId,
        agency.id,
        agency.name,
        agency.username || undefined,
        'responding'
      )
      await fetchAssignedIncidents()
    } catch (err) {
      console.error('Immediate action error:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeclineDispatch = async (id: string) => {
    setUpdatingId(id)
    try {
      await declineAgencyDispatch(id)
      setIncidents((prev) => prev.filter((item) => item.id !== id))
      setNearestAlerts((prev) => prev.filter((n) => n.incident.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 font-sans">

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
          onClick={() => fetchAssignedIncidents(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-200 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg transition-all cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Dispatches
        </button>
      </div>

      {/* AI Nearest Station Emergency Alert Notification Banner */}
      {nearestAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border-2 border-red-600 bg-gradient-to-r from-red-950 via-slate-900 to-red-900 p-5 text-white shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-red-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-300">
                <Sparkles size={14} className="text-yellow-400 animate-pulse" /> AI Nearest Station Alert ({nearestAlerts.length})
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300 bg-red-900/90 px-3 py-1 rounded-full border border-red-600/80 shadow-xs">
              ⚡ Immediate Action Recommended
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {nearestAlerts.map(({ incident: inc, matchResult }) => {
              const isUpdating = updatingId === inc.id
              const isResponding = inc.status === 'responding'

              return (
                <div
                  key={inc.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-black/50 rounded-lg border border-red-700/50 hover:border-red-500/80 transition-all"
                >
                  <div className="flex flex-col gap-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded bg-red-600 text-white shadow-2xs">
                        {inc.severity} Priority
                      </span>
                      <h3 className="text-sm font-extrabold text-white capitalize">
                        {inc.disaster_type} Incident Report
                      </h3>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/60">
                        <Navigation size={12} /> {matchResult.distanceKm} km away (~{matchResult.estimatedTimeMin} mins ETA)
                      </span>
                    </div>

                    <p className="text-xs text-gray-200 flex items-center gap-1.5 font-semibold">
                      <MapPin size={13} className="text-red-400 shrink-0" />
                      <span>{inc.location_text}</span>
                    </p>

                    <div className="text-[11px] text-red-200 bg-red-950/70 p-2.5 rounded border border-red-900/60 flex items-start gap-1.5 leading-relaxed">
                      <Sparkles size={12} className="text-yellow-400 shrink-0 mt-0.5" />
                      <span><strong>AI Match:</strong> You are identified as the nearest specialized response station. {matchResult.aiReason}</span>
                    </div>
                  </div>

                  {/* Immediate Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isResponding && inc.status !== 'rescued' && inc.status !== 'closed' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleImmediateAction(inc.id)}
                          className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-500 rounded-lg shadow-lg border border-emerald-400/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Zap size={14} className="fill-yellow-300 text-yellow-300 animate-pulse" />
                          {isUpdating ? 'Dispatching…' : 'Accept & Respond 🟢'}
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleDeclineDispatch(inc.id)}
                          className="px-3 py-2 text-xs font-bold text-red-300 hover:text-red-100 bg-red-950/70 hover:bg-red-900/90 border border-red-800/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} /> {isUpdating ? 'Declining…' : 'Decline 🔴'}
                        </button>
                      </div>
                    )}

                    {isResponding && (
                      <span className="px-3 py-1.5 text-xs font-black uppercase text-emerald-400 bg-emerald-950/80 rounded border border-emerald-700/60 flex items-center gap-1">
                        <CheckCircle size={13} /> Unit Active En Route
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedIncident(inc)}
                      className="px-3 py-2 text-xs font-bold text-gray-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye size={13} /> Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              className={`px-3 py-1 rounded text-xs font-extrabold capitalize transition-all cursor-pointer ${
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
            const nearestMatch = nearestAlerts.find((n) => n.incident.id === inc.id)?.matchResult

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

                {/* 🏢 Requesting LGU Command Center Badge */}
                <div className="px-3 py-2 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-purple-100 rounded-md border border-purple-800 flex items-center justify-between text-xs font-bold flex-wrap gap-2 shadow-xs">
                  <span className="flex items-center gap-1.5 text-purple-200">
                    <Building2 size={13} className="text-purple-400 shrink-0" />
                    <span>Requesting Office: <strong className="text-white font-extrabold">{inc.assigned_agency_name ? `LGU Command Center (Assigned to ${agency?.name || 'Your Unit'})` : 'LGU Emergency Command Center'}</strong></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/80 px-2 py-0.5 rounded border border-purple-700">
                    LGU Dispatch Request
                  </span>
                </div>

                {/* AI Nearest Station Badge */}
                {nearestMatch && (
                  <div className="px-3 py-1.5 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-red-200 rounded-md flex items-center justify-between text-xs font-bold text-red-900 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-red-800">
                      <Sparkles size={13} className="text-yellow-600" /> <strong>AI Recommends You:</strong> Nearest Station ({nearestMatch.distanceKm} km away)
                    </span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      ETA ~{nearestMatch.estimatedTimeMin} mins
                    </span>
                  </div>
                )}

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
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <Eye size={13} /> View Full Details & Map <ChevronRight size={13} />
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Immediate Action / Accept Button */}
                    {(inc.status === 'pending' || nearestMatch) && inc.status !== 'responding' && inc.status !== 'rescued' && inc.status !== 'closed' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleImmediateAction(inc.id)}
                        className="px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Zap size={13} className="fill-yellow-300 text-yellow-300" />
                        {isUpdating ? 'Dispatching…' : 'Respond Immediately 🟢'}
                      </button>
                    )}

                    {inc.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleDeclineDispatch(inc.id)}
                        className="px-3 py-1.5 text-xs font-extrabold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <X size={13} /> {isUpdating ? 'Declining…' : 'Decline Dispatch 🔴'}
                      </button>
                    )}

                    {inc.status === 'responding' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(inc.id, 'rescued')}
                        className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                      >
                        {isUpdating ? 'Updating…' : 'Mark as Rescued / On Scene 🛟'}
                      </button>
                    )}

                    {inc.status === 'rescued' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(inc.id, 'closed')}
                        className="px-3.5 py-1.5 text-xs font-extrabold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors cursor-pointer"
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
          isLGU={false}
        />
      )}

    </div>
  )
}
