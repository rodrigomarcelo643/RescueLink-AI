import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import {
  getPublicHappenings,
  calculateAIPrediction,
  type PublicHappening,
  type AIPredictionResult
} from '@/services/aiPredictionService'
import type { Incident } from '@/types/incident'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import HappeningsMapAlert from '@/components/incidents/HappeningsMapAlert'
import AIPredictionInspector from '@/components/incidents/AIPredictionInspector'
import HappeningDetailModal from '@/components/incidents/HappeningDetailModal'
import PWAInstallWidgetModal from '@/components/shared/PWAInstallWidgetModal'
import mainLogo from '@/assets/logo/main_logo.jpg'
import {
  requestDeviceNotificationPermission,
  sendSampleDeviceNotification,
  checkAndSendProximityNotification,
  saveUserGPSCoordinates,
  initLiveProximityPushListener,
} from '@/services/deviceNotificationService'
import {
  AlertTriangle, Radio, MapPin, ArrowLeft, FileText,
  Filter, Navigation, ExternalLink, Activity, Search, ChevronRight,
  ShieldCheck, ShieldAlert, Bell
} from 'lucide-react'

export default function PublicHappenings() {
  const navigate = useNavigate()
  const isWidgetMode = new URLSearchParams(window.location.search).get('mode') === 'widget'
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [happenings, setHappenings] = useState<PublicHappening[]>([])
  const [loading, setLoading] = useState(true)

  // Selected location coordinates (Default: User's Current Location)
  const [selectedCoords, setSelectedCoords] = useState({ lat: 14.5995, lng: 120.9842 })
  const [locationName, setLocationName] = useState('Your Current Proximity')
  const [prediction, setPrediction] = useState<AIPredictionResult | null>(null)
  const [locating, setLocating] = useState(false)
  const [disasterFilter, setDisasterFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'map_alert' | 'ai_forecast' | 'incident' | 'advisory'>('all')

  // Full Details Modal state
  const [selectedDetailItem, setSelectedDetailItem] = useState<Incident | PublicHappening | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenDetail = (item: Incident | PublicHappening) => {
    setSelectedDetailItem(item)
    setModalOpen(true)
  }

  const fetchAllData = useCallback(async (coords?: { lat: number; lng: number }, forcedType?: string) => {
    try {
      const { data } = await supabase
        .from('rescue_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      const incData: Incident[] = (data as Incident[]) || []
      setIncidents(incData)

      const targetLat = coords?.lat ?? selectedCoords.lat
      const targetLng = coords?.lng ?? selectedCoords.lng
      const typeFilter = forcedType ?? (disasterFilter === 'all' ? undefined : disasterFilter)

      // Calculate AI prediction based on nearest accidents & disaster patterns
      const pred = calculateAIPrediction(targetLat, targetLng, incData, locationName, typeFilter)
      setPrediction(pred)

      // Fetch public happenings stream
      const hList = await getPublicHappenings(coords)
      setHappenings(hList)

      // Evaluate proximity alert push notification for latest unresolved emergency ticket
      if (incData.length > 0) {
        const latest = incData[0]
        if (latest.status === 'pending' || latest.status === 'responding') {
          checkAndSendProximityNotification(latest, { lat: targetLat, lng: targetLng }, 15)
        }
      }
    } catch (e) {
      console.error('Error fetching public happenings:', e)
    } finally {
      setLoading(false)
    }
  }, [selectedCoords, locationName, disasterFilter])

  const handleSimulateDisaster = (type: string) => {
    setDisasterFilter(type)
    fetchAllData(selectedCoords, type === 'all' ? undefined : type)
  }

  // Auto-detect user's current location on mount & auto-request push notifications
  useEffect(() => {
    initLiveProximityPushListener()
    requestDeviceNotificationPermission()

    if (navigator.geolocation) {
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          saveUserGPSCoordinates(pos.coords.latitude, pos.coords.longitude)
          setSelectedCoords(coords)
          setLocationName('Your Current Proximity')
          fetchAllData(coords)
          setLocating(false)
        },
        (err) => {
          console.warn('Geolocation unavailable or permission denied, using default center:', err)
          setLocating(false)
          fetchAllData()
        },
        { enableHighAccuracy: true, timeout: 7000 }
      )
    } else {
      fetchAllData()
    }

    // Realtime postgres channel for incoming emergency reports
    const channelName = `happenings_channel_${Math.random().toString(36).substring(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rescue_tickets' },
        () => fetchAllData()
      )
      .subscribe()

    return () => {
      setTimeout(() => {
        supabase.removeChannel(channel)
      }, 100)
    }
  }, [])

  const handleLocateUser = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        saveUserGPSCoordinates(pos.coords.latitude, pos.coords.longitude)
        setSelectedCoords(coords)
        setLocationName('Your Current Proximity')
        fetchAllData(coords)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  const handleSelectCoordinates = (lat: number, lng: number) => {
    const coords = { lat, lng }
    saveUserGPSCoordinates(lat, lng)
    setSelectedCoords(coords)
    setLocationName(`Selected Spot (${lat.toFixed(3)}, ${lng.toFixed(3)})`)
    const pred = calculateAIPrediction(lat, lng, incidents, `Selected Spot (${lat.toFixed(3)}, ${lng.toFixed(3)})`)
    setPrediction(pred)
  }

  const handleSelectPreset = (lat: number, lng: number, name: string) => {
    const coords = { lat, lng }
    setSelectedCoords(coords)
    setLocationName(name)
    const pred = calculateAIPrediction(lat, lng, incidents, name)
    setPrediction(pred)
  }

  const filteredHappenings = activeTab === 'all'
    ? happenings
    : happenings.filter((h) => h.type === activeTab)

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans pb-16">
      {/* Sticky Navigation Header */}
      {isWidgetMode ? (
        <div className="sticky top-0 z-30 border-b border-purple-900 bg-purple-950 px-4 py-2.5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 rounded-md object-cover" />
            <span className="text-xs font-black tracking-tight text-white">RescueLink AI — Happenings Widget</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 text-[10px] font-extrabold bg-purple-800 hover:bg-purple-700 text-amber-300 rounded-md transition-colors cursor-pointer"
          >
            Refresh 🔄
          </button>
        </div>
      ) : (
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-2.5 sm:px-6 py-2 sm:py-2.5 backdrop-blur-md shadow-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-3 shrink">
              <img src={mainLogo} alt="RescueLink AI" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg object-cover shadow-xs shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-gray-900 leading-tight truncate">
                  RescueLink AI
                </h1>
                <p className="text-[11px] font-semibold text-gray-500 hidden md:block">Public Happenings & Community Risk Telemetry</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <PWAInstallWidgetModal />
              <Link
                to="/report"
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-all shadow-xs"
              >
                <FileText size={13} className="shrink-0" />
                <span className="hidden xs:inline font-extrabold">Report 🚨</span>
                <span className="xs:hidden font-black">SOS</span>
              </Link>
              <button
                onClick={() => navigate('/public')}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden font-black">Back</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-6">

        {/* Hero Title & Live Indicator */}
        <div className="bg-gradient-to-r from-red-900 via-purple-950 to-gray-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-red-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden sm:block">
            <Radio size={160} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-red-600/90 text-white rounded-full flex items-center gap-1">
                  <Activity size={12} /> Live Telemetry
                </span>
                <span className="text-[11px] sm:text-xs text-red-200 font-semibold">Updated Seconds Ago</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
                Public Happenings & Community Risk Hub
              </h2>
              <p className="mt-1 text-xs text-gray-200 max-w-2xl font-medium leading-relaxed">
                Real-time neighborhood event telemetry, community risk assessments, and nearest accident tracking to keep residents safe and informed.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={async () => {
                  const ok = await sendSampleDeviceNotification()
                  if (ok) {
                    alert('🔔 Emergency Push Alerts Enabled! You will receive background device notifications when accidents occur near your GPS location.')
                  } else {
                    alert('Please allow Notifications in your browser/device settings to receive background emergency proximity alerts.')
                  }
                }}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Bell size={14} className="text-slate-950 animate-bounce" /> Enable Phone Push Alerts 🔔
              </button>
              <button
                onClick={handleLocateUser}
                disabled={locating}
                className="w-full sm:w-auto px-4 py-2 text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Navigation size={14} className={locating ? 'animate-spin' : ''} />
                {locating ? 'Locating Spot…' : 'Inspect My Location Risk'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Disaster & Evacuation Recommendation Banner */}
        {prediction && (
          prediction.riskScore === 0 || prediction.calamityReadiness.evacuationStatus === 'normal' ? (
            <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-emerald-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="size-10 sm:size-11 rounded-xl bg-emerald-800/80 border border-emerald-600 flex items-center justify-center text-emerald-300 font-black shrink-0 mt-0.5">
                  <ShieldCheck size={22} className="animate-pulse text-emerald-300" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white rounded">
                      🟢 SECTOR ALL CLEAR — NO ACTIVE RISK
                    </span>
                    <span className="text-xs font-bold text-emerald-300 font-mono">
                      Live Risk Score: 0%
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    All Emergency Reports Resolved & Closed 🟢
                  </h3>
                  <p className="text-xs text-emerald-200 font-medium max-w-2xl">
                    📍 All emergency tickets in {prediction.locationName} have been completed by response units. No active disaster risk detected.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/report"
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} /> Report New Incident 🚨
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-purple-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="size-10 sm:size-11 rounded-xl bg-purple-800/80 border border-purple-600 flex items-center justify-center text-purple-300 font-black shrink-0 mt-0.5">
                  <ShieldAlert size={22} className="animate-pulse text-amber-400" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded">
                      {prediction.riskLevel.toUpperCase()} RISK ({(prediction.dominantHazard || 'DISASTER').toUpperCase()})
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      Live Risk Score: {prediction.riskScore}%
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    AI Recommends Preemptive Evacuation to: {prediction.calamityReadiness.matchedEvacuationCenter?.name || 'Nearest Evacuation Center'}
                  </h3>
                  <p className="text-xs text-purple-200 font-medium max-w-2xl">
                    📍 Located {prediction.calamityReadiness.matchedEvacuationCenter?.distance || 'nearby'} from your GPS position ({prediction.calamityReadiness.matchedEvacuationCenter?.capacity || 400} spots available).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/report"
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} /> Send SOS 🚨
                </Link>
              </div>
            </div>
          )
        )}

        {/* AI Forecast Inspector & Happenings Map Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column: AI Prediction Inspector */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <AIPredictionInspector
              prediction={prediction}
              loading={loading}
              onLocateUser={handleLocateUser}
              locating={locating}
              onSelectBarangay={handleSelectPreset}
              onSelectIncident={handleOpenDetail}
              onSimulateDisaster={handleSimulateDisaster}
              activeDisasterFilter={disasterFilter}
            />
          </div>

          {/* Right Column: Happenings Interactive Map Alert */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                    <Radio size={15} className="text-red-600 shrink-0" />
                    Public Map Alert & Incident Heatmap
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
                    Click any location on the map to evaluate risk or click incident markers to view full details.
                  </p>
                </div>

                {prediction?.mapAlert && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-700 rounded-full animate-pulse shrink-0">
                    Active Map Alert
                  </span>
                )}
              </div>

              <HappeningsMapAlert
                incidents={incidents}
                prediction={prediction}
                selectedLocation={selectedCoords}
                onSelectCoordinates={handleSelectCoordinates}
                onSelectIncident={handleOpenDetail}
              />
            </div>
          </div>
        </div>

        {/* Live Public Happenings Stream */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Radio size={17} className="text-purple-600 shrink-0" />
                Live Public Happenings & Community Feed
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                Aggregated public stream of verified emergency reports, map alerts, and neighborhood risk assessments.
              </p>
            </div>

            {/* Filter Pills — Smooth Horizontal Scroll on Mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <span className="text-[11px] text-gray-400 font-extrabold flex items-center gap-1 mr-1 shrink-0">
                <Filter size={12} /> Filter:
              </span>
              {[
                { id: 'all', label: 'All', icon: ShieldCheck },
                { id: 'map_alert', label: 'Map Alerts', icon: AlertTriangle },
                { id: 'ai_forecast', label: 'Risk Assessments', icon: ShieldAlert },
                { id: 'incident', label: 'Emergency Reports', icon: MapPin },
                { id: 'advisory', label: 'LGU Notices', icon: Radio },
              ].map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    style={{
                      border: '1px solid',
                      borderColor: activeTab === tab.id ? '#b91c1c' : '#e5e7eb',
                      background: activeTab === tab.id ? '#fef2f2' : '#fff',
                      color: activeTab === tab.id ? '#b91c1c' : '#4b5563',
                    }}
                  >
                    <IconComponent size={13} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feed List */}
          {filteredHappenings.length === 0 ? (
            <EmptyState
              title="No Happenings Found"
              description="No public items logged for this category."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredHappenings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="group flex flex-col justify-between gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase rounded text-white"
                        style={{ backgroundColor: item.badgeColor }}
                      >
                        {item.badgeText}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 group-hover:text-red-700 transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-medium flex items-center gap-1">
                        <MapPin size={12} className="shrink-0 text-red-600" />
                        <span className="truncate">{item.locationText}</span>
                      </p>
                    </div>

                    <p className="text-[11px] sm:text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-semibold text-[10px] sm:text-[11px]">Click for details</span>
                    <span className="font-extrabold text-red-700 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px] sm:text-xs">
                      <Search size={12} /> Full Details <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full Detail Modal */}
        <HappeningDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          item={selectedDetailItem}
          userCoords={selectedCoords}
        />

      </div>
    </div>
  )
}
