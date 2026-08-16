import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getIncidents } from '@/services/incidents.service'
import { getVolunteerByUserId } from '@/services/volunteers.service'
import type { Incident } from '@/types/incident'
import { Sparkles, CheckCircle2, HeartHandshake, Moon } from 'lucide-react'

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

interface AIMatchCardItem {
  ticket: Incident
  confidence: number
  distanceKm: number
  matchedSkills: string[]
  matchNotes: string
}

export default function VolunteerMatches() {
  const { user, profile } = useAuth()
  const [isAvailable, setIsAvailable] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptedIds, setAcceptedIds] = useState<string[]>([])
  const [ignoredIds, setIgnoredIds] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  // Fetch initial volunteer status from Supabase
  useEffect(() => {
    if (user?.id) {
      getVolunteerByUserId(user.id).then((vol) => {
        if (vol) setIsAvailable(!!vol.is_available)
      })
    }
  }, [user?.id])

  // Track live GPS position
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS notice:', err),
        { enableHighAccuracy: true }
      )
    }

    getIncidents().then((list) => {
      setIncidents(list.filter((i) => i.status === 'pending' || i.status === 'responding'))
      setLoading(false)
    })
  }, [])

  const handleDecision = (id: string, action: 'accept' | 'ignore') => {
    if (action === 'accept') {
      setAcceptedIds((prev) => [...prev, id])
      setIgnoredIds((prev) => prev.filter((x) => x !== id))
      setNotice(`You ACCEPTED the AI Endorsement for Ticket #${id.slice(0, 8)}. Mission registered! 🚀`)
    } else {
      setIgnoredIds((prev) => [...prev, id])
      setAcceptedIds((prev) => prev.filter((x) => x !== id))
      setNotice(`AI Endorsement for Ticket #${id.slice(0, 8)} ignored.`)
    }
    setTimeout(() => setNotice(null), 3500)
  }

  // Compute AI Skill & Proximity Matches
  const matches: AIMatchCardItem[] = incidents
    .filter((ticket) => !ignoredIds.includes(ticket.id))
    .map((ticket) => {
      const volSkills = ((profile as any)?.skills || ['First Aid', 'Search & Rescue']).map((s: string) => s.toLowerCase())
      const disasterType = (ticket.disaster_type || '').toLowerCase()
      const msg = (ticket.raw_message || '').toLowerCase()

      let score = 50
      const matchedSkills: string[] = []

      if (disasterType.includes('flood') || msg.includes('baha')) {
        if (volSkills.some((s: string) => s.includes('boat') || s.includes('rescue'))) {
          score += 35
          matchedSkills.push('Boat & Flood Rescue')
        }
      }

      if (disasterType.includes('fire') || msg.includes('sunog')) {
        if (volSkills.some((s: string) => s.includes('fire') || s.includes('medical') || s.includes('first aid'))) {
          score += 35
          matchedSkills.push('Fire & Emergency Response')
        }
      }

      if (volSkills.some((s: string) => s.includes('medical') || s.includes('first aid'))) {
        score += 20
        matchedSkills.push('First Aid Capability')
      }

      let distanceKm = 1.4
      if (coords && ticket.latitude && ticket.longitude) {
        distanceKm = getDistanceKm(coords.lat, coords.lng, ticket.latitude, ticket.longitude)
        if (distanceKm < 3) score += 25
        else if (distanceKm < 8) score += 10
      }

      const finalConfidence = Math.min(99, Math.max(65, score))

      return {
        ticket,
        confidence: finalConfidence,
        distanceKm,
        matchedSkills: matchedSkills.length > 0 ? matchedSkills : ['General Emergency Response'],
        matchNotes: `AI Skill Match (${matchedSkills.join(', ') || 'Standard Emergency'}) + ${distanceKm} km Proximity`,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Info */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-red-700" />
            AI Skill & Proximity Match Endorsements
          </h1>
          <p className="text-xs text-gray-400">
            AI automatically recommends emergency missions based on your verified skills and current GPS location. You decide whether to accept or ignore.
          </p>
        </div>

        {coords && (
          <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-mono text-emerald-700 font-extrabold shadow-2xs">
            📍 Live GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* CONDITIONAL DISPLAY BASED ON VOLUNTEER IS_AVAILABLE STATUS */}
      {!isAvailable ? (
        <div className="p-10 bg-white rounded-xl border border-gray-200 text-center flex flex-col items-center gap-3 shadow-2xs">
          <div className="size-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center border border-amber-200">
            <Moon size={24} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">AI Endorsements Paused (Standby Status)</h3>
            <p className="text-xs text-gray-500 max-w-md mt-1 font-medium leading-relaxed">
              Your deployment availability is currently set to <span className="font-bold text-amber-800">Standby (Inactive)</span>. Switch to Active on your Dashboard to view AI Endorsements.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-gray-400 text-xs font-semibold bg-white rounded-xl border border-gray-200">
          Evaluating AI Skill & GPS Proximity Endorsements…
        </div>
      ) : matches.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs font-semibold">
          No new AI Endorsements at this moment. You are up to date!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((item) => {
            const isAccepted = acceptedIds.includes(item.ticket.id)

            return (
              <div
                key={item.ticket.id}
                className={`p-6 rounded-xl border transition-all flex flex-col justify-between gap-4 bg-white shadow-2xs ${
                  isAccepted ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Top Match Header */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
                      <Sparkles size={11} className="text-red-700" /> {item.confidence}% AI Match Confidence
                    </span>
                    <span className="text-[11px] font-mono font-bold text-gray-700">
                      📍 {item.distanceKm} km away
                    </span>
                  </div>

                  <div>
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 rounded">
                      🚨 {item.ticket.disaster_type}
                    </span>
                    <h3 className="text-xs font-extrabold text-gray-900 leading-snug mt-2">
                      {item.ticket.location_text}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
                    "{item.ticket.raw_message}"
                  </p>

                  {/* Matched Skills Pills */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.matchedSkills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 rounded border border-blue-200">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Decision Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  {isAccepted ? (
                    <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Endorsement Accepted! Responding 🚀
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDecision(item.ticket.id, 'ignore')}
                        className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer"
                      >
                        Ignore ✕
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecision(item.ticket.id, 'accept')}
                        className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <HeartHandshake size={14} /> Accept Endorsement & Join Mission 🚀
                      </button>
                    </>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
