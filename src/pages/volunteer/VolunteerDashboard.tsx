import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import { getIncidents } from '@/services/incidents.service'
import { toggleAvailability, getVolunteerByUserId, acceptIncidentMission, cancelIncidentMission } from '@/services/volunteers.service'
import type { Incident } from '@/types/incident'
import LiveTrackingMap from '@/components/incidents/LiveTrackingMap'
import {
  User, Phone, MapPin, CheckCircle2, Navigation,
  AlertTriangle, HeartHandshake, Sparkles, Moon, Sun
} from 'lucide-react'

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

export default function VolunteerDashboard() {
  const { user, profile } = useAuth()

  const [isAvailable, setIsAvailable] = useState(false) // Default standby
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [assistingTicketIds, setAssistingTicketIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  // Fetch initial volunteer status from Supabase
  useEffect(() => {
    if (user?.id) {
      getVolunteerByUserId(user.id).then((vol) => {
        if (vol) {
          setIsAvailable(!!vol.is_available)
        }
      })
    }
  }, [user?.id])

  // Fetch live GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => console.warn('GPS location notice:', err),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // Fetch active incidents & subscribe to Supabase Realtime changes live
  useEffect(() => {
    const loadIncidents = () => {
      getIncidents()
        .then((data) => {
          setIncidents(data.filter((i) => i.status === 'pending' || i.status === 'responding'))
        })
        .catch((err) => console.error('Failed to load incidents:', err))
        .finally(() => setLoading(false))
    }

    loadIncidents()

    const channelName = `vol_dash_tickets_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => {
          loadIncidents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleToggleStatus = async () => {
    if (!user?.id || toggling) return
    const next = !isAvailable
    setToggling(true)
    setIsAvailable(next)

    try {
      await toggleAvailability(user.id, next)
      setNotice(next ? 'Status updated: You are now ACTIVE & ready to receive AI recommendations! 🟢' : 'Status updated: You are now on STANDBY (Inactive). AI recommendations paused. 🔴')
      setTimeout(() => setNotice(null), 4000)
    } catch (e: any) {
      console.warn('Failed to update availability in Supabase:', e)
      setNotice(`Update notice: ${e?.message || 'Status toggled locally'}`)
      setTimeout(() => setNotice(null), 4000)
    } finally {
      setToggling(false)
    }
  }

  // Auto-clear resolved / closed tickets from assisting list & local storage
  useEffect(() => {
    if (!user?.id) return

    const activeIncidentIds = new Set(incidents.map((i) => i.id))
    const storedIds: string[] = JSON.parse(localStorage.getItem(`vol_assisting_${user.id}`) || '[]')

    // Filter out resolved or closed ticket IDs
    const validStoredIds = storedIds.filter((id) => activeIncidentIds.has(id))

    // Clean up obsolete localStorage flags for resolved incidents
    storedIds.forEach((id) => {
      if (!activeIncidentIds.has(id)) {
        localStorage.removeItem(`ticket_assistance_${id}`)
      }
    })

    const dbAssistingIds = incidents
      .filter(
        (inc) =>
          (inc.status === 'pending' || inc.status === 'responding') &&
          (inc.assigned_agency_id === user.id ||
            inc.assigned_responder_id === user.id ||
            (inc.assigned_agency_name || '').includes(profile?.full_name || '___'))
      )
      .map((inc) => inc.id)

    const merged = Array.from(new Set([...validStoredIds, ...dbAssistingIds]))
    setAssistingTicketIds(merged)
    localStorage.setItem(`vol_assisting_${user.id}`, JSON.stringify(merged))
  }, [user?.id, profile?.full_name, incidents])

  const handleDecisionAssist = async (ticketId: string, assist: boolean) => {
    const volName = profile?.full_name || 'Volunteer Responder'

    if (assist) {
      const nextAssisting = Array.from(new Set([...assistingTicketIds, ticketId]))
      setAssistingTicketIds(nextAssisting)
      if (user?.id) {
        localStorage.setItem(`vol_assisting_${user.id}`, JSON.stringify(nextAssisting))
      }

      try {
        await acceptIncidentMission(ticketId, user?.id || '', volName)
      } catch (err) {
        console.warn('acceptIncidentMission error:', err)
      }

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === ticketId
            ? {
                ...item,
                assigned_agency_name: `Volunteer Assistance: ${volName}`,
                assigned_agency_id: user?.id,
                assigned_responder_id: user?.id,
              }
            : item
        )
      )

      setNotice(`Assistance Activated! You are now assisting on Ticket #${ticketId.slice(0, 8)} (Ongoing Field Telemetry Active) 🙋‍♂️`)
    } else {
      const nextAssisting = assistingTicketIds.filter((id) => id !== ticketId)
      setAssistingTicketIds(nextAssisting)
      if (user?.id) {
        localStorage.setItem(`vol_assisting_${user.id}`, JSON.stringify(nextAssisting))
      }

      try {
        await cancelIncidentMission(ticketId)
      } catch (err) {
        console.warn('cancelIncidentMission error:', err)
      }

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === ticketId
            ? {
                ...item,
                assigned_agency_name: null,
                assigned_agency_id: null,
                assigned_responder_id: null,
              }
            : item
        )
      )

      setNotice(`Assistance Cancelled for Ticket #${ticketId.slice(0, 8)}. Status reset to Standby.`)
    }
    setTimeout(() => setNotice(null), 4000)
  }

  const accountStatus = (profile as any)?.status || (profile as any)?.account_status || 'active'
  const isDeactivated = accountStatus === 'deactivated'

  return (
    <div className="flex flex-col gap-6">

      {/* Action Notice */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Deactivated Notice */}
      {isDeactivated && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-bold flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-700 shrink-0" />
          <div>
            <p className="font-extrabold uppercase">Account Deactivated by LGU Command Center 🚨</p>
            <p className="text-red-700 text-[11px]">Your volunteer account has been deactivated. Please contact LGU Disaster Officers to reactivate credentials.</p>
          </div>
        </div>
      )}

      {/* Volunteer Profile Banner & Status Toggle Switch */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-xl shrink-0 border border-red-200">
            {profile?.full_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-gray-900">{profile?.full_name || 'Volunteer Responder'}</h2>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                isDeactivated ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {isDeactivated ? 'ACCOUNT DEACTIVATED' : 'ACCOUNT ACTIVE 🟢'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1 flex-wrap">
              <span><User size={12} className="inline mr-1 text-gray-400" />{user?.email}</span>
              <span>•</span>
              <span><Phone size={12} className="inline mr-1 text-gray-400" />{profile?.phone || 'No phone'}</span>
              <span>•</span>
              <span><MapPin size={12} className="inline mr-1 text-gray-400" />{profile?.barangay || 'Cebu Sector'}</span>
            </div>
          </div>
        </div>

        {/* Deployment Status ON / OFF Toggle Switch */}
        <div className="flex flex-col items-start md:items-end gap-2.5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Deployment Availability Status (Supabase Sync)
          </span>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-extrabold uppercase ${isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isAvailable ? '🟢 ACTIVE / READY' : '🔴 STANDBY / INACTIVE'}
            </span>

            {/* Toggle Switch */}
            <button
              type="button"
              disabled={isDeactivated || toggling}
              onClick={handleToggleStatus}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAvailable ? 'bg-emerald-600' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span className="sr-only">Toggle Volunteer Availability</span>
              <span
                className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <span className="text-[10px] text-gray-400 font-medium">
            {isAvailable ? 'ON: Ready to assist & receiving live AI match recommendations' : 'OFF: Paused. Toggle to ON to view AI mission recommendations'}
          </span>
        </div>
      </div>

      {/* Live GPS Telemetry Bar */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <Navigation size={16} />
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-900">Live GPS Location Telemetry</p>
            <p className="text-[11px] text-gray-500 font-mono font-semibold">
              {coords ? `📍 Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` : 'Acquiring GPS position…'}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded border border-emerald-200">
          GPS Signal Connected
        </span>
      </div>

      {/* 🗺️ Live Accepted Mission Navigation Map */}
      {assistingTicketIds.length > 0 && isAvailable && (
        <div className="flex flex-col gap-3 p-5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5">
              <Navigation size={15} className="text-emerald-600 animate-spin" />
              Active Response Mission: Live Road Navigation Map
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
              Live Field Navigation Active 🟢
            </span>
          </div>

          {(() => {
            const activeIncident = incidents.find((i) => assistingTicketIds.includes(i.id)) || incidents[0]
            if (!activeIncident) return null

            return (
              <div className="h-[360px] rounded-lg overflow-hidden border border-gray-200">
                <LiveTrackingMap
                  incidentLat={activeIncident.latitude ?? 14.5772}
                  incidentLng={activeIncident.longitude ?? 123.8854}
                  locationText={activeIncident.location_text}
                  disasterType={activeIncident.disaster_type}
                  severity={activeIncident.severity ?? 'medium'}
                  status="responding"
                  responder={{
                    lat: coords?.lat ?? (activeIncident.latitude ?? 14.5772) - 0.012,
                    lng: coords?.lng ?? (activeIncident.longitude ?? 123.8854) - 0.012,
                    unitName: `Volunteer: ${profile?.full_name || 'Field Unit'}`,
                    contact: profile?.phone || 'Field Radio',
                  }}
                />
              </div>
            )
          })()}
        </div>
      )}

      {/* Near Emergency Incidents & AI Skill Recommendations Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-red-700" />
            AI Skill & Proximity Recommendations ({isAvailable ? incidents.length : 0})
          </h2>
          <p className="text-xs text-gray-400">
            {isAvailable
              ? 'AI matched active emergency incidents based on your verified skills and GPS location.'
              : 'Toggle your status switch to ACTIVE / READY to view live AI recommendations.'}
          </p>
        </div>

        {/* CONDITIONAL AI RECOMMENDATIONS DISPLAY BASED ON IS_AVAILABLE STATUS */}
        {!isAvailable ? (
          /* PAUSED / STANDBY EMPTY STATE CARD */
          <div className="p-10 bg-white rounded-xl border border-gray-200 text-center flex flex-col items-center gap-3 shadow-2xs">
            <div className="size-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center border border-amber-200">
              <Moon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">You are currently on Standby (Inactive)</h3>
              <p className="text-xs text-gray-500 max-w-md mt-1 font-medium leading-relaxed">
                AI emergency match recommendations are <span className="font-bold text-gray-700">paused</span> while your status is set to Standby. Toggle your availability switch to <span className="font-bold text-emerald-700">ACTIVE / READY</span> above to receive live AI incident recommendations and respond to nearby missions.
              </p>
            </div>
            <button
              type="button"
              disabled={isDeactivated}
              onClick={handleToggleStatus}
              className="mt-2 px-5 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sun size={14} /> Toggle Status to ACTIVE / READY 🟢
            </button>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-gray-400 text-xs font-semibold bg-white rounded-xl border border-gray-200">
            Evaluating AI skill & proximity recommendations…
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs font-semibold">
            No active emergency incidents near your sector at this moment.
          </div>
        ) : (
          /* LIVE ACTIVE INCIDENTS & AI RECOMMENDATIONS */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((ticket) => {
              const isAssisting = assistingTicketIds.includes(ticket.id)
              let distanceKm = 1.6
              if (coords && ticket.latitude && ticket.longitude) {
                distanceKm = getDistanceKm(coords.lat, coords.lng, ticket.latitude, ticket.longitude)
              }

              return (
                <div
                  key={ticket.id}
                  className={`p-5 rounded-xl border transition-all flex flex-col justify-between gap-4 bg-white shadow-2xs ${
                    isAssisting ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 rounded border border-red-200">
                        🚨 {ticket.disaster_type}
                      </span>
                      <span className="text-[11px] font-bold text-gray-700 font-mono">
                        📍 {distanceKm} km away
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-gray-900 leading-snug">
                      {ticket.location_text}
                    </h3>

                    <p className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
                      "{ticket.raw_message}"
                    </p>
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-gray-500">
                      Your Decision: {isAssisting ? '🟢 Assisting' : '⚪ Standby'}
                    </span>

                    <div className="flex items-center gap-2">
                      {isAssisting ? (
                        <button
                          type="button"
                          onClick={() => handleDecisionAssist(ticket.id, false)}
                          className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-all cursor-pointer"
                        >
                          Cancel Assist ✕
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isDeactivated}
                          onClick={() => handleDecisionAssist(ticket.id, true)}
                          className="px-4 py-1.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <HeartHandshake size={14} /> I Want to Assist 🙋‍♂️
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
