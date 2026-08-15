import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import HappeningDetailModal from '@/components/incidents/HappeningDetailModal'
import PWAInstallWidgetModal from '@/components/shared/PWAInstallWidgetModal'
import mainLogo from '@/assets/logo/main_logo.jpg'
import type { Donation } from '@/types/donation'
import type { Incident } from '@/types/incident'
import {
  AlertTriangle, Heart, Users, MapPin, ArrowLeft, LocateFixed, FileText,
  Navigation, Radio
} from 'lucide-react'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#fffbeb', color: '#b45309', label: 'Pending Dispatch ⏳' },
  responding: { bg: '#eff6ff', color: '#1d4ed8', label: 'Responders En Route 🚨' },
  rescued:    { bg: '#f0fdf4', color: '#15803d', label: 'Operation Resolved 🟢' },
  closed:     { bg: '#f9fafb', color: '#6b7280', label: 'Closed' },
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PublicDashboard() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [radiusKm, setRadiusKm] = useState(10)
  const [locationLabel, setLocationLabel] = useState('All Areas')
  const [useLocation, setUseLocation] = useState(false)

  // Full Details Modal state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('rescue_tickets').select('*').in('status', ['pending', 'responding']),
      supabase.from('donations').select('*').eq('status', 'confirmed'),
    ]).then(([inc, don]) => {
      const data = inc.data ?? []
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setIncidents(data)
      setDonations(don.data ?? [])
      setLoading(false)
    })

    // Realtime channel for active public tickets
    const channelName = `public_dash_tickets_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        async () => {
          const { data } = await supabase.from('rescue_tickets').select('*').in('status', ['pending', 'responding'])
          if (data) {
            data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            setIncidents(data)
          }
        }
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [])

  // Auto-detect user location on mount
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
    { label: 'Total Donations Raised', value: `₱${totalDonations.toLocaleString()}`, icon: Heart, color: '#ec4899' },
    { label: 'Verified Donors', value: donations.length, icon: Users, color: '#8b5cf6' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans pb-12">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-3 sm:px-6 py-2.5 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img src={mainLogo} alt="RescueLink AI" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover shadow-xs" />
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-gray-900 leading-tight">RescueLink AI</h1>
              <p className="text-[11px] font-semibold text-gray-500 hidden sm:block">Public Disaster Transparency & Live Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <PWAInstallWidgetModal />
            <Link
              to="/happenings"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg transition-all shadow-2xs shrink-0"
              title="Community Risk & Happenings"
            >
              <Radio size={14} className="text-purple-700 animate-pulse shrink-0" />
              <span className="hidden md:inline">Community Risk & Happenings 🛡️</span>
              <span className="md:hidden font-black">Happenings</span>
            </Link>
            <Link
              to="/report"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-all shadow-xs shrink-0"
              title="Report Emergency Incident"
            >
              <FileText size={14} className="shrink-0" />
              <span className="hidden sm:inline">Report Incident 🚨</span>
              <span className="sm:hidden font-black">Report 🚨</span>
            </Link>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Width Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">

        {/* AI Risk Forecast & Public Happenings Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-purple-950 to-gray-900 text-white border border-purple-800/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-800/60 rounded-xl border border-purple-500/30 shrink-0">
              <Radio size={22} className="text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white rounded">
                  LIVE TELEMETRY
                </span>
                <span className="text-[11px] text-purple-200 font-semibold flex items-center gap-1">
                  <Radio size={11} /> Community Hazard Predictor
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold mt-1 text-white">
                Public Happenings & Community Risk Telemetry
              </h3>
              <p className="text-xs text-purple-200 max-w-2xl mt-0.5">
                Check neighborhood disaster risk scores, nearest accident proximity patterns, and active map alerts tailored for your area.
              </p>
            </div>
          </div>

          <Link
            to="/happenings"
            className="px-4 py-2 text-xs font-extrabold text-purple-950 bg-white hover:bg-purple-50 rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            Open Happenings Hub →
          </Link>
        </div>

        {/* Dashboard Title & Proximity Filters */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-red-600"></span>
              </span>
              <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Live Public Operations Overview</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">Real-time public incident updates and rescue status telemetry. Click any report to view live route tracking.</p>
          </div>

          {/* Location Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLocate}
              disabled={locating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer"
              style={{
                borderRadius: 6,
                border: '1px solid',
                borderColor: useLocation ? '#1d4ed8' : '#d1d5db',
                background: useLocation ? '#eff6ff' : '#fff',
                color: useLocation ? '#1d4ed8' : '#374151',
              }}
            >
              <LocateFixed size={13} className={locating ? 'animate-spin' : ''} />
              {locating ? 'Locating…' : locationLabel}
            </button>

            {useLocation && (
              <>
                {[5, 10, 25, 50].map((km) => (
                  <button
                    key={km}
                    onClick={() => setRadiusKm(km)}
                    className="px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                    style={{
                      borderRadius: 6,
                      border: '1px solid',
                      borderColor: radiusKm === km ? '#b91c1c' : '#e5e7eb',
                      background: radiusKm === km ? '#fef2f2' : '#fff',
                      color: radiusKm === km ? '#b91c1c' : '#4b5563',
                    }}
                  >
                    {km} km
                  </button>
                ))}
                <button
                  onClick={() => { setUseLocation(false); setLocationLabel('All Areas') }}
                  className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  style={{ borderRadius: 6, border: '1px solid #e5e7eb' }}
                >
                  Show All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col gap-2.5 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Icon size={16} style={{ color }} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Active Incidents Section */}
        <div>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-gray-900">Active Emergency Reports</h3>
              <span className="px-2 py-0.5 text-xs font-extrabold bg-red-100 text-red-700 rounded-full">
                {filtered.length} Active
              </span>
            </div>
            <span className="text-xs text-gray-400 font-semibold">
              Click any report to open live route tracker
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No Active Emergency Incidents"
              description={useLocation ? `No incidents detected within ${radiusKm} km of your location.` : 'All clear — no active rescue tickets.'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((i) => {
                const statusCfg = STATUS_STYLE[i.status] ?? STATUS_STYLE.pending

                return (
                  <div
                    key={i.id}
                    onClick={() => { setSelectedIncident(i); setModalOpen(true) }}
                    className="group flex flex-col justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase rounded text-white bg-red-600">
                          {i.severity} Severity
                        </span>
                        <span
                          className="px-2 py-0.5 text-[11px] font-bold capitalize rounded"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-gray-900 capitalize group-hover:text-red-700 transition-colors">
                          {i.disaster_type} Incident
                        </h4>
                        <p className="mt-1 text-xs text-gray-600 font-medium line-clamp-2 flex items-start gap-1">
                          <MapPin size={13} className="shrink-0 text-red-600 mt-0.5" />
                          <span>{i.location_text}</span>
                        </p>
                      </div>

                      {i.assigned_agency_name && (
                        <div className="mt-1 p-2 bg-blue-50 border border-blue-100 rounded-md text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Navigation size={12} className="text-blue-600 shrink-0" />
                          <span className="truncate">Assigned: {i.assigned_agency_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                      <span className="font-mono text-[11px] text-gray-400">ID: {i.id.slice(0, 10)}…</span>
                      <span className="font-bold text-red-700 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Details 🔍 →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Full Details Modal */}
        <HappeningDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          item={selectedIncident}
          userCoords={userCoords}
        />

      </div>
    </div>
  )
}
