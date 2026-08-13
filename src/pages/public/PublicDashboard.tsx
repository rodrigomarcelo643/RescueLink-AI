import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import mainLogo from '@/assets/logo/main_logo.jpg'
import type { Donation } from '@/types/donation'
import type { Incident } from '@/types/incident'
import { AlertTriangle, Heart, Users, MapPin, Clock, ArrowLeft, LocateFixed, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

const SEVERITY_DOT: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#b91c1c',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: '#fffbeb', color: '#b45309' },
  responding: { bg: '#eff6ff', color: '#1d4ed8' },
  rescued:    { bg: '#f0fdf4', color: '#15803d' },
  closed:     { bg: '#f9fafb', color: '#6b7280' },
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PublicDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [radiusKm, setRadiusKm] = useState(10)
  const [locationLabel, setLocationLabel] = useState('All Areas')
  const [useLocation, setUseLocation] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('rescue_tickets').select('*').in('status', ['pending', 'responding']),
      supabase.from('donations').select('*').eq('status', 'confirmed'),
    ]).then(([inc, don]) => {
      setIncidents(inc.data ?? [])
      setDonations(don.data ?? [])
      setLoading(false)
    })
  }, [])

  // Auto-detect on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationLabel('Near You')
          setUseLocation(true)
          setLocating(false)
        },
        () => setLocating(false)
      )
    }
  }, [])

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLabel('Near You')
        setUseLocation(true)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }, [])

  const navigate = useNavigate()
  const totalDonations = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)

  const filtered = useLocation && userCoords
    ? incidents.filter((i) =>
        i.latitude && i.longitude &&
        distanceKm(userCoords.lat, userCoords.lng, i.latitude, i.longitude) <= radiusKm
      )
    : incidents

  if (loading) return <LoadingSpinner />

  const stats = [
    { label: 'Active Incidents', value: filtered.length, icon: AlertTriangle, color: '#b91c1c' },
    { label: 'Total Donations', value: `₱${totalDonations.toLocaleString()}`, icon: Heart, color: '#ec4899' },
    { label: 'Donors', value: donations.length, icon: Users, color: '#8b5cf6' },
  ]

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* ── Left brand panel ── */}
      <div
        className="relative hidden w-[38%] flex-col items-center justify-center gap-8 bg-white p-16 lg:flex"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <img src={mainLogo} alt="RescueLink AI" className="w-48 object-contain" style={{ borderRadius: 12 }} />
        <div className="text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">RescueLink AI</h1>
          <p className="mt-1 text-sm font-medium text-gray-400">Public Transparency Dashboard</p>
        </div>
        <div
          className="flex w-full max-w-xs divide-x divide-gray-100 overflow-hidden"
          style={{ border: '1px solid #f0f0f0', borderRadius: 5 }}
        >
          {[{ n: String(incidents.length), d: 'Active' }, { n: String(donations.length), d: 'Donors' }, { n: 'Live', d: 'Updates' }].map(({ n, d }) => (
            <div key={d} className="flex flex-1 flex-col items-center py-3">
              <span className="text-base font-extrabold text-gray-900">{n}</span>
              <span className="text-[11px] font-medium text-gray-400">{d}</span>
            </div>
          ))}
        </div>
        <p className="absolute bottom-8 text-[11px] text-gray-300">
          © {new Date().getFullYear()} RescueLink AI · Philippines
        </p>
      </div>

      {/* ── Right content ── */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-10 lg:px-10">

        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <img src={mainLogo} alt="RescueLink AI" className="w-20 object-contain" style={{ borderRadius: 8 }} />
          <p className="text-sm font-extrabold text-gray-900">RescueLink AI</p>
          <p className="text-xs text-gray-400">Public Transparency Dashboard</p>
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Live Overview</h2>
            <p className="mt-0.5 text-sm text-gray-400">Real-time data. No login required.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/report"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#b91c1c', borderRadius: 5 }}
            >
              <FileText size={12} /> Report Incident
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
              style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
          </div>
        </div>

        {/* Location filter */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderRadius: 5, border: '1px solid',
              borderColor: useLocation ? '#1d4ed8' : '#e5e7eb',
              background: useLocation ? '#eff6ff' : '#fff',
              color: useLocation ? '#1d4ed8' : '#6b7280',
            }}
          >
            <LocateFixed size={12} className={locating ? 'animate-spin' : ''} />
            {locating ? 'Locating…' : locationLabel}
          </button>

          {useLocation && (
            <>
              {[5, 10, 25, 50].map((km) => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    borderRadius: 5, border: '1px solid',
                    borderColor: radiusKm === km ? '#b91c1c' : '#e5e7eb',
                    background: radiusKm === km ? '#fef2f2' : '#fff',
                    color: radiusKm === km ? '#b91c1c' : '#6b7280',
                  }}
                >
                  {km} km
                </button>
              ))}
              <button
                onClick={() => { setUseLocation(false); setLocationLabel('All Areas') }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-600"
                style={{ borderRadius: 5, border: '1px solid #e5e7eb' }}
              >
                Show All
              </button>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col gap-3 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Incidents */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-extrabold text-gray-900">Active Incidents</p>
            <span className="text-[11px] text-gray-400">
              {filtered.length}{useLocation ? ` within ${radiusKm} km` : ''}
            </span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No active incidents" description={useLocation ? `No incidents within ${radiusKm} km of your location.` : 'All clear — no ongoing rescue operations.'} />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((i) => (
                <div key={i.id} className="flex flex-col gap-2 bg-white p-4" style={{ border: '1px solid #e5e7eb', borderRadius: 5 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ background: SEVERITY_DOT[i.severity] ?? '#6b7280' }}
                      />
                      <div>
                        <p className="text-sm font-extrabold capitalize text-gray-900">
                          {i.disaster_type} — {i.location_text}
                        </p>
                        {i.ai_summary && <p className="mt-0.5 text-xs text-gray-400">{i.ai_summary}</p>}
                      </div>
                    </div>
                    <span
                      className="shrink-0 px-2 py-0.5 text-[10px] font-extrabold capitalize"
                      style={{
                        borderRadius: 4,
                        background: STATUS_STYLE[i.status]?.bg ?? '#f9fafb',
                        color: STATUS_STYLE[i.status]?.color ?? '#6b7280',
                      }}
                    >
                      {i.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 pl-4 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={10} /> {i.location_text}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(i.created_at).toLocaleString()}</span>
                    {useLocation && userCoords && i.latitude && i.longitude && (
                      <span className="flex items-center gap-1">
                        <LocateFixed size={10} />
                        {distanceKm(userCoords.lat, userCoords.lng, i.latitude, i.longitude).toFixed(1)} km away
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
